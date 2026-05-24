import * as path from 'path';
import * as fs from 'fs';
import { readJson, writeJson, today, dataPath, latestFile } from './utils';
import type { CandidatesFile, SelectedFile, SofCluster, StoryCandidate } from './types';

const BASE_LEDE = 30;
const BASE_SPREAD = 30;
// SoF uses one story per session; 60 clusters → ~60 sessions
const BASE_SOF_CLUSTERS = 60;
const MIN_SUMMARY_LENGTH = 80;

function score(c: StoryCandidate): number {
  let s = 0;
  if (c.headline.length < 100) s += 2;
  if (['science', 'nature', 'technology'].includes(c.domain)) s += 2;
  if (c.ingestSource === 'researched') s += 3;
  if (c.summary.length > MIN_SUMMARY_LENGTH) s += 1;
  if (c.hasNumber) s += 1;
  if (c.tags.includes('weird')) s += 5;  // weird stories are high-value for Lede
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

  // Merge supplemental candidate files if present (weird, researched)
  let allCandidates = candidates;
  const seenIds = new Set(candidates.map((c) => c.id));

  for (const suffix of ['-weird', '-researched']) {
    const supplementPath = filePath.replace(/\.json$/, `${suffix}.json`);
    if (!fs.existsSync(supplementPath)) continue;
    try {
      const { candidates: extra } = readJson<CandidatesFile>(supplementPath);
      const unique = extra.filter((c) => !seenIds.has(c.id));
      unique.forEach((c) => seenIds.add(c.id));
      allCandidates = [...allCandidates, ...unique];
      console.log(`  + ${unique.length} candidates (from ${path.basename(supplementPath)})`);
    } catch {
      // Supplemental file unavailable — no-op
    }
  }

  // Collect story IDs and headline fingerprints used in previous selections.
  // ID-based dedup catches same-article re-use; fingerprint-based dedup catches
  // the same NEWS STORY covered by different sources/URLs on different days.
  const previouslyUsedIds = new Set<string>();
  const previouslyUsedFingerprints = new Set<string>();

  // Stop words excluded from fingerprinting — too common to be distinctive.
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been',
    'has', 'have', 'had', 'that', 'this', 'it', 'its', 'as', 'up', 'into',
    'than', 'then', 'so', 'if', 'not', 'no', 'how', 'what', 'when', 'who',
    'after', 'over', 'new', 'out', 'about', 'across', 'says', 'said',
  ]);

  /** Returns a sorted tuple of 3+ distinctive words from a headline. */
  function headlineFingerprint(headline: string): string {
    return headline
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length >= 5 && !STOP_WORDS.has(w))
      .sort()
      .join('|');
  }

  const selectedDir = dataPath('selected');
  if (fs.existsSync(selectedDir)) {
    const todayStr = today();
    for (const file of fs.readdirSync(selectedDir).filter((f) => f.endsWith('.json') && !f.startsWith(todayStr))) {
      try {
        const prev = readJson<SelectedFile>(path.join(selectedDir, file));
        const addCandidate = (c: StoryCandidate) => {
          previouslyUsedIds.add(c.id);
          const fp = headlineFingerprint(c.headline);
          if (fp) previouslyUsedFingerprints.add(fp);
        };
        prev.lede.forEach(addCandidate);
        prev.spread.forEach(addCandidate);
        prev.sofClusters.forEach((cl) => cl.stories.forEach(addCandidate));
      } catch {
        // Skip unreadable files
      }
    }
  }

  const freshCandidates = allCandidates.filter((c) => {
    if (previouslyUsedIds.has(c.id)) return false;
    // Reject if the headline fingerprint matches a previously used story.
    // This catches same-story-different-URL situations (e.g. viral news covered
    // by multiple sources on consecutive days).
    const fp = headlineFingerprint(c.headline);
    if (fp && previouslyUsedFingerprints.has(fp)) return false;
    return true;
  });
  if (previouslyUsedIds.size > 0) {
    const skipped = allCandidates.length - freshCandidates.length;
    console.log(`  ${skipped} skipped (used in previous days)  →  ${freshCandidates.length} fresh`);
  }

  console.log(`  ${freshCandidates.length} total candidates  (scale=${scale}: targets lede=${TARGET_LEDE} spread=${TARGET_SPREAD} sof=${TARGET_SOF_CLUSTERS})`);

  const sorted = [...freshCandidates].sort((a, b) => score(b) - score(a));

  // Each story is used by exactly one game. Selection order determines priority:
  // Lede first (all sources including weird), then Spread (standard ingest only, has number),
  // then SoF from science/nature/technology stories only.
  // Both ID and headline fingerprint are tracked so the same news story covered by two
  // different URLs (different IDs) can't appear in multiple games on the same day.
  const usedIds = new Set<string>();
  const usedFingerprints = new Set<string>();

  function trackUsed(c: StoryCandidate) {
    usedIds.add(c.id);
    const fp = headlineFingerprint(c.headline);
    if (fp) usedFingerprints.add(fp);
  }

  function isUnused(c: StoryCandidate): boolean {
    if (usedIds.has(c.id)) return false;
    const fp = headlineFingerprint(c.headline);
    return !(fp && usedFingerprints.has(fp));
  }

  // Lede: all sources (weird stories are high-value here)
  const lede = sorted.slice(0, TARGET_LEDE);
  lede.forEach(trackUsed);

  // Spread: standard ingest only (no weird), must have a number
  const remaining1 = sorted.filter((c) => isUnused(c) && !c.tags.includes('weird'));
  const spread = remaining1.filter((c) => c.hasNumber).slice(0, TARGET_SPREAD);
  spread.forEach(trackUsed);

  // SoF: science/nature/technology domain stories only (no weird)
  const SOF_DOMAINS = new Set(['science', 'nature', 'technology']);
  const remaining2 = sorted.filter(
    (c) => isUnused(c) && SOF_DOMAINS.has(c.domain) && !c.tags.includes('weird')
  );
  const byDomain = new Map<string, StoryCandidate[]>();
  for (const c of remaining2) {
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
