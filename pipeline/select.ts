import * as path from 'path';
import { readJson, writeJson, today, dataPath, latestFile } from './utils';
import type { CandidatesFile, SelectedFile, SofCluster, StoryCandidate } from './types';

const BASE_LEDE = 30;
const BASE_SPREAD = 30;
const BASE_SOF_CLUSTERS = 15;
const MIN_SUMMARY_LENGTH = 80;

function score(c: StoryCandidate): number {
  let s = 0;
  if (c.headline.length < 100) s += 2;
  if (['science', 'nature', 'technology'].includes(c.domain)) s += 2;
  if (c.ingestSource === 'wikipedia') s += 2;
  if (c.summary.length > MIN_SUMMARY_LENGTH) s += 1;
  if (c.hasNumber) s += 1;
  return s;
}

function main() {
  const scaleArg = process.argv.find((a) => a.startsWith('--scale='));
  const scale = scaleArg ? parseFloat(scaleArg.split('=')[1]) : 1;
  if (isNaN(scale) || scale <= 0) throw new Error('--scale must be a positive number');

  const TARGET_LEDE = Math.round(BASE_LEDE * scale);
  const TARGET_SPREAD = Math.round(BASE_SPREAD * scale);
  const TARGET_SOF_CLUSTERS = Math.round(BASE_SOF_CLUSTERS * scale);

  const filePath = latestFile(dataPath('candidates'), 'Run pipeline:ingest first.');
  console.log(`Reading candidates from ${path.basename(filePath)}`);
  const { candidates } = readJson<CandidatesFile>(filePath);
  console.log(`  ${candidates.length} candidates  (scale=${scale}: targets lede=${TARGET_LEDE} spread=${TARGET_SPREAD} sof=${TARGET_SOF_CLUSTERS})`);

  const sorted = [...candidates].sort((a, b) => score(b) - score(a));

  const lede = sorted.slice(0, TARGET_LEDE);

  const spread = sorted.filter((c) => c.hasNumber).slice(0, TARGET_SPREAD);

  const byDomain = new Map<string, StoryCandidate[]>();
  for (const c of sorted) {
    const group = byDomain.get(c.domain) ?? [];
    group.push(c);
    byDomain.set(c.domain, group);
  }
  const sofClusters: SofCluster[] = [];
  for (const [domain, stories] of byDomain) {
    if (stories.length >= 2) {
      sofClusters.push({ domain, stories: stories.slice(0, 3) });
    }
    if (sofClusters.length >= TARGET_SOF_CLUSTERS) break;
  }

  const out: SelectedFile = { date: today(), lede, spread, sofClusters };
  const outPath = dataPath('selected', `${today()}.json`);
  writeJson(outPath, out);

  console.log(`\nSelected:`);
  console.log(`  Lede:         ${lede.length}`);
  console.log(`  Spread:       ${spread.length}`);
  console.log(`  SoF clusters: ${sofClusters.length}`);
  console.log(`✓ Written to ${outPath}`);
}

main();
