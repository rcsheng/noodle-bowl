import * as path from 'path';
import * as fs from 'fs';
import { readJson, writeJson, today, dataPath, latestFile } from './utils';
import type { CandidatesFile, SelectedFile, SofCluster, StoryCandidate } from './types';

const BASE_LEDE = 30;
const BASE_SPREAD = 30;
// SoF uses 2 items per session (standard + weird), so 2× base needed for equal session count
const BASE_SOF_CLUSTERS = 60;
const MIN_SUMMARY_LENGTH = 80;

function score(c: StoryCandidate): number {
  let s = 0;
  if (c.headline.length < 100) s += 2;
  if (['science', 'nature', 'technology'].includes(c.domain)) s += 2;
  if (c.ingestSource === 'wikipedia') s += 2;
  if (c.summary.length > MIN_SUMMARY_LENGTH) s += 1;
  if (c.hasNumber) s += 1;
  if (c.tags.includes('weird')) s += 5;
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

  // Merge weird candidates if pipeline:ingest:weird has been run today
  let allCandidates = candidates;
  const weirdPath = filePath.replace(/\.json$/, '-weird.json');
  if (fs.existsSync(weirdPath)) {
    try {
      const { candidates: weirdCandidates } = readJson<CandidatesFile>(weirdPath);
      const seenIds = new Set(candidates.map((c) => c.id));
      const uniqueWeird = weirdCandidates.filter((c) => !seenIds.has(c.id));
      allCandidates = [...candidates, ...uniqueWeird];
      console.log(`  + ${uniqueWeird.length} weird candidates (from ${path.basename(weirdPath)})`);
    } catch {
      // Weird candidates unavailable — no-op
    }
  }

  console.log(`  ${allCandidates.length} total candidates  (scale=${scale}: targets lede=${TARGET_LEDE} spread=${TARGET_SPREAD} sof=${TARGET_SOF_CLUSTERS})`);

  const sorted = [...allCandidates].sort((a, b) => score(b) - score(a));

  const lede = sorted.slice(0, TARGET_LEDE);

  const spread = sorted.filter((c) => c.hasNumber).slice(0, TARGET_SPREAD);

  const byDomain = new Map<string, StoryCandidate[]>();
  for (const c of sorted) {
    const group = byDomain.get(c.domain) ?? [];
    group.push(c);
    byDomain.set(c.domain, group);
  }
  // Round-robin across domains for topic variety. Each cluster is one story;
  // generate.ts extracts two real claims from it so all three claims stay coherent.
  const domainList = Array.from(byDomain.entries()).filter(([, s]) => s.length >= 1);
  const domainIdx = new Map(domainList.map(([d]) => [d, 0]));
  const sofClusters: SofCluster[] = [];
  let madeProgress = true;
  while (sofClusters.length < TARGET_SOF_CLUSTERS && madeProgress) {
    madeProgress = false;
    for (const [domain, stories] of domainList) {
      if (sofClusters.length >= TARGET_SOF_CLUSTERS) break;
      const i = domainIdx.get(domain)!;
      if (i < stories.length) {
        sofClusters.push({ domain, stories: [stories[i]] });
        domainIdx.set(domain, i + 1);
        madeProgress = true;
      }
    }
  }

  const out: SelectedFile = { date: today(), lede, spread, sofClusters };
  const outPath = dataPath('selected', `${today()}.json`);
  writeJson(outPath, out);

  console.log(`\nSelected:`);
  console.log(`  Lede:         ${lede.length} (target ${TARGET_LEDE})`);
  console.log(`  Spread:       ${spread.length} (target ${TARGET_SPREAD})`);
  console.log(`  SoF clusters: ${sofClusters.length} (target ${TARGET_SOF_CLUSTERS} → ~${Math.floor(sofClusters.length / 2)} sessions)`);
  if (sofClusters.length < TARGET_SOF_CLUSTERS) {
    console.warn(`  WARNING: SoF short of target — add more days with --days=N or run pipeline:ingest:bulk`);
  }
  console.log(`✓ Written to ${outPath}`);
}

main();
