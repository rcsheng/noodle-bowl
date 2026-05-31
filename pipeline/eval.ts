/**
 * pipeline/eval.ts
 *
 * Post-generation structural quality check. Runs immediately after generate.ts
 * on the produced batch file. No LLM calls — all checks are rule-based and free.
 *
 * Checks for each game:
 *   Lede:   partial headline has blank, 3 panelists, 1 correct, no numbers in completions, distinct completions
 *   Spread: answer is a number, singular unit, question doesn't reveal answer, substantive explanation
 *   SoF:    2 claims, correct isScience flags, null source on fake, similar claim lengths
 *
 * Exit code 0 = all checks passed
 * Exit code 1 = one or more items failed (flagged items listed; batch still written)
 *
 * Usage (standalone):
 *   npm run pipeline:eval                        # evaluates latest generated file
 *   PIPELINE_DATE=2026-05-31 npm run pipeline:eval
 */

import type { LedeItem, SpreadItem, SofItem } from '../constants/data';
import { loadEnv, dataPath, latestFile, readJson } from './utils';
import * as path from 'path';

interface ContentBanks {
  lede: LedeItem[];
  spread: SpreadItem[];
  sof: SofItem[];
  quip: unknown[];
  wave: unknown[];
}

loadEnv();

// ─── Per-item checks ──────────────────────────────────────────────────────────

interface ItemReport {
  index: number;
  preview: string;
  pass: boolean;
  failures: string[];
}

function checkLede(item: LedeItem, index: number): ItemReport {
  const failures: string[] = [];

  if (!item.partialHeadline?.includes('___'))
    failures.push('partialHeadline must contain ___');
  if (!Array.isArray(item.panelists) || item.panelists.length !== 3)
    failures.push('must have exactly 3 panelists');
  if (Array.isArray(item.panelists) && item.panelists.filter((p) => p.isCorrect).length !== 1)
    failures.push('must have exactly 1 correct panelist');
  if (Array.isArray(item.panelists) && item.panelists.some((p) => /\d/.test(p.completion ?? '')))
    failures.push('completions must not contain numbers');
  if (Array.isArray(item.panelists)) {
    const completions = item.panelists.map((p) => p.completion?.trim().toLowerCase());
    if (new Set(completions).size !== 3) failures.push('completions must be distinct');
  }
  if (!item.explanation || item.explanation.trim().length <= 20)
    failures.push('explanation must be non-empty (>20 chars)');

  return {
    index,
    preview: item.partialHeadline?.slice(0, 60) ?? '(no headline)',
    pass: failures.length === 0,
    failures,
  };
}

function checkSpread(item: SpreadItem, index: number): ItemReport {
  const failures: string[] = [];

  if (!item.question || item.question.trim().length <= 10)
    failures.push('question must be a non-empty string');
  if (typeof item.answer !== 'number' || isNaN(item.answer) || !isFinite(item.answer))
    failures.push('answer must be a finite number');
  if (typeof item.unit !== 'string')
    failures.push('unit must be a string');
  // Unit should be singular: allow empty string (year answers) or non-'s'-ending words
  if (typeof item.unit === 'string' && item.unit !== '' && item.unit.length > 3 && item.unit.endsWith('s'))
    failures.push('unit should be singular (e.g. "kilometer" not "kilometers")');
  if (item.question && String(item.answer) !== '' && item.question.includes(String(item.answer)))
    failures.push('question should not reveal the answer number');
  if (!item.explanation || item.explanation.trim().length <= 50)
    failures.push('explanation must be substantive (>50 chars)');
  if (!Array.isArray(item.others) || item.others.length !== 0)
    failures.push('others must be an empty array');

  return {
    index,
    preview: item.question?.slice(0, 60) ?? '(no question)',
    pass: failures.length === 0,
    failures,
  };
}

function checkSof(item: SofItem, index: number): ItemReport {
  const failures: string[] = [];

  if (!item.topic?.trim()) failures.push('topic must be non-empty');
  if (!Array.isArray(item.claims) || item.claims.length !== 2)
    failures.push('must have exactly 2 claims');
  if (Array.isArray(item.claims) && item.claims[0]?.isScience !== true)
    failures.push('claims[0] must have isScience: true');
  if (Array.isArray(item.claims) && item.claims[1]?.isScience !== false)
    failures.push('claims[1] must have isScience: false');
  if (Array.isArray(item.claims) && item.claims[1]?.source !== null)
    failures.push('claims[1].source must be null');
  if (
    Array.isArray(item.claims) &&
    (item.claims[0]?.source == null || !item.claims[0].source?.name)
  ) {
    failures.push('claims[0].source must have a non-empty name');
  }
  if (Array.isArray(item.claims) && item.claims.some((c) => !c.text || c.text.trim().length <= 20))
    failures.push('all claim texts must be non-trivial (>20 chars)');
  if (
    Array.isArray(item.claims) &&
    Math.abs((item.claims[0]?.text?.length ?? 0) - (item.claims[1]?.text?.length ?? 0)) > 120
  ) {
    failures.push('real and fake claims should be similar in length (within 120 chars)');
  }

  return {
    index,
    preview: item.topic ?? '(no topic)',
    pass: failures.length === 0,
    failures,
  };
}

// ─── Report printer ───────────────────────────────────────────────────────────

interface GameReport {
  game: string;
  total: number;
  passed: number;
  failed: number;
  items: ItemReport[];
}

function printReport(reports: GameReport[]): boolean {
  let allPassed = true;

  for (const report of reports) {
    const passed = report.passed;
    const total = report.total;
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const icon = report.failed === 0 ? '✅' : '⚠️ ';
    console.log(`\n${icon} ${report.game.toUpperCase().padEnd(7)} ${passed}/${total} passed (${rate}%)`);

    for (const item of report.items.filter((r) => !r.pass)) {
      allPassed = false;
      console.log(`   [${item.index}] "${item.preview}"`);
      for (const failure of item.failures) {
        console.log(`        ✗ ${failure}`);
      }
    }
  }

  console.log('\n' + '─'.repeat(50));
  if (allPassed) {
    console.log('✅ All structural checks passed.\n');
  } else {
    console.log('⚠️  Some items failed structural checks — see above.\n');
  }

  return allPassed;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  const filePath = process.env['PIPELINE_DATE']
    ? dataPath('generated', `${process.env['PIPELINE_DATE']}.json`)
    : latestFile(dataPath('generated'), 'Run pipeline:generate first.');

  console.log(`\nEvaluating: ${path.basename(filePath)}`);

  const banks = readJson<ContentBanks>(filePath);

  const ledeReports = banks.lede.map((item, i) => checkLede(item as LedeItem, i));
  const spreadReports = banks.spread.map((item, i) => checkSpread(item as SpreadItem, i));
  const sofReports = banks.sof.map((item, i) => checkSof(item as SofItem, i));

  const reports: GameReport[] = [
    { game: 'lede', total: ledeReports.length, passed: ledeReports.filter((r) => r.pass).length, failed: ledeReports.filter((r) => !r.pass).length, items: ledeReports },
    { game: 'spread', total: spreadReports.length, passed: spreadReports.filter((r) => r.pass).length, failed: spreadReports.filter((r) => !r.pass).length, items: spreadReports },
    { game: 'sof', total: sofReports.length, passed: sofReports.filter((r) => r.pass).length, failed: sofReports.filter((r) => !r.pass).length, items: sofReports },
  ];

  const allPassed = printReport(reports);
  if (!allPassed) process.exit(1);
}

main();
