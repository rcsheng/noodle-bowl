/**
 * pipeline/extract-fixtures.ts
 *
 * Pulls a random sample of real StoryCandidate inputs from pipeline/data/selected/
 * and writes them as YAML snippets ready to paste into evals/{game}/test-cases.yaml.
 *
 * This keeps your PromptFoo test cases grounded in real pipeline data rather than
 * hand-crafted stories.
 *
 * Usage:
 *   npm run eval:extract-fixtures               # 5 of each game type
 *   npm run eval:extract-fixtures -- --count=10
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadEnv, dataPath, readJson } from './utils';
import type { StoryCandidate, SofCluster, SelectedFile } from './types';

loadEnv();

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

function storyToYaml(s: StoryCandidate, game: 'lede' | 'spread' | 'sof', index: number): string {
  const esc = (str: string) => str.replace(/"/g, '\\"');
  const lines = [
    `- description: "[extracted] ${game} ${index + 1} — ${s.source}"`,
    `  vars:`,
    `    headline: "${esc(s.headline)}"`,
    `    summary: "${esc(s.summary)}"`,
    `    source: ${s.source}`,
  ];
  if (game === 'sof') {
    lines.push(`    url: "${esc(s.url)}"`);
    lines.push(`    domain: "${s.domain}"`);
  }
  lines.push(`  assert:`);
  lines.push(`    - type: is-json`);
  lines.push(`      metric: is-json`);
  lines.push(`    - type: javascript`);
  lines.push(`      value: "file://assertions.js:${game}Structure"`);
  lines.push(`      metric: structural`);
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const count = countArg ? parseInt(countArg.split('=')[1]) : 5;

  const selectedDir = dataPath('selected');
  if (!fs.existsSync(selectedDir)) {
    console.error(`pipeline/data/selected/ not found. Run pipeline:select first.`);
    process.exit(1);
  }

  const files = fs.readdirSync(selectedDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(selectedDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    console.error('No selected/*.json files found.');
    process.exit(1);
  }

  const latest = path.join(selectedDir, files[0].name);
  console.log(`Reading from ${files[0].name}...`);

  const data = readJson<SelectedFile>(latest);
  const sofStories = data.sofClusters.flatMap((c: SofCluster) => c.stories);

  const ledeYaml   = pickRandom(data.lede, Math.min(count, data.lede.length)).map((s, i) => storyToYaml(s, 'lede', i)).join('\n');
  const spreadYaml = pickRandom(data.spread, Math.min(count, data.spread.length)).map((s, i) => storyToYaml(s, 'spread', i)).join('\n');
  const sofYaml    = pickRandom(sofStories, Math.min(count, sofStories.length)).map((s, i) => storyToYaml(s, 'sof', i)).join('\n');

  const outDir = path.resolve(__dirname, '..', 'eval-results', 'extracted-fixtures');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'lede-cases.yaml'), ledeYaml);
  fs.writeFileSync(path.join(outDir, 'spread-cases.yaml'), spreadYaml);
  fs.writeFileSync(path.join(outDir, 'sof-cases.yaml'), sofYaml);

  console.log(`\n✓ Extracted to eval-results/extracted-fixtures/`);
  console.log('  Copy entries from those files into evals/{game}/test-cases.yaml to expand your test suite.');
}

main();
