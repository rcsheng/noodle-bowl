import * as path from 'path';
import { readJson, dataPath, latestFile } from './utils';
import type { LedeItem, SpreadItem, SofItem, QuipPrompt, WaveItem } from '../constants/data';

interface ContentBanks {
  lede: LedeItem[];
  spread: SpreadItem[];
  sof: SofItem[];
  quip: QuipPrompt[];
  wave: WaveItem[];
}

function sample<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

function hr(label: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(label);
  console.log('─'.repeat(60));
}

function printLede(item: LedeItem, i: number) {
  console.log(`\n[${i}] ${item.partialHeadline}`);
  item.panelists.forEach((p, j) => {
    const marker = p.isCorrect ? ' ✓' : '  ';
    console.log(`    ${j + 1}.${marker} ${p.completion}`);
  });
  console.log(`    → ${item.explanation}`);
  console.log(`    (${item.sourceHint})`);
}

function printSpread(item: SpreadItem, i: number) {
  console.log(`\n[${i}] ${item.question}`);
  console.log(`    Answer: ${item.answer} ${item.unit}`);
  console.log(`    ${item.explanation}`);
}

function printSof(item: SofItem, i: number) {
  console.log(`\n[${i}] ${item.topic}`);
  item.claims.forEach((c, j) => {
    const tag = c.isScience ? '(real) ' : '(FAKE) ';
    console.log(`    ${j + 1}. ${tag}${c.text}`);
    if (c.source) console.log(`           src: ${c.source.name}`);
  });
}

function printQuip(item: QuipPrompt, i: number) {
  console.log(`\n[${i}] ${item.setup}`);
  console.log(`    (${item.sourceHint})`);
}

function printWave(item: WaveItem, i: number) {
  console.log(`\n[${i}] ${item.story}`);
  console.log(`    ← ${item.leftLabel} | ${item.rightLabel} →`);
  console.log(`    Position: ${item.truthPosition}/100`);
  console.log(`    ${item.explanation}`);
}

function main() {
  const filePath = latestFile(dataPath('generated'), 'Run pipeline:generate first.');
  console.log(`Reviewing ${path.basename(filePath)}`);
  const banks = readJson<ContentBanks>(filePath);

  hr(`LEDE — ${banks.lede.length} total (showing 5 random)`);
  sample(banks.lede, 5).forEach(printLede);

  hr(`SPREAD — ${banks.spread.length} total (showing 5 random)`);
  sample(banks.spread, 5).forEach(printSpread);

  hr(`SOF — ${banks.sof.length} total (showing 5 random)`);
  sample(banks.sof, 5).forEach(printSof);

  hr(`QUIP — ${banks.quip.length} total (showing 3 random)`);
  sample(banks.quip, 3).forEach(printQuip);

  hr(`WAVE — ${banks.wave.length} total (showing 3 random)`);
  sample(banks.wave, 3).forEach(printWave);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`COUNTS  lede:${banks.lede.length}  spread:${banks.spread.length}  sof:${banks.sof.length}  quip:${banks.quip.length}  wave:${banks.wave.length}`);
}

main();
