import { loadEnv, requireEnv, httpGet, today, writeJson, dataPath, sha256 } from './utils';
import type { StoryCandidate, CandidatesFile, TheNewsAPIArticle } from './types';

loadEnv();

const NUMBER_PATTERN = /\b\d[\d,.]*\s*(million|billion|trillion|thousand|percent|%|km|miles|kg|lbs|days|years|hours|seconds|mph|mph)?\b/i;

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  science: ['research', 'study', 'scientists', 'space', 'climate', 'medical', 'biology', 'physics', 'AI', 'artificial intelligence', 'genome', 'vaccine'],
  nature: ['animal', 'species', 'ocean', 'forest', 'wildlife', 'plant', 'insect', 'whale', 'bird', 'coral'],
  politics: ['congress', 'senate', 'president', 'election', 'government', 'policy', 'law', 'court', 'vote', 'legislation'],
  business: ['company', 'CEO', 'stock', 'market', 'startup', 'economy', 'trade', 'merger', 'acquisition', 'IPO'],
  technology: ['software', 'app', 'robot', 'drone', 'chip', 'cybersecurity', 'hack', 'data', 'internet', 'satellite'],
  culture: ['film', 'music', 'art', 'book', 'sport', 'food', 'fashion', 'museum', 'award', 'record'],
};

function classify(headline: string, summary: string): { hasNumber: boolean; domain: string } {
  const text = `${headline} ${summary}`;
  const hasNumber = NUMBER_PATTERN.test(text);
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((kw) => text.toLowerCase().includes(kw.toLowerCase()))) {
      return { hasNumber, domain };
    }
  }
  return { hasNumber, domain: 'general' };
}

// Returns YYYY-MM-DD for a date N days ago
function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function toCandidate(a: TheNewsAPIArticle): StoryCandidate {
  const { hasNumber, domain } = classify(a.title, a.description ?? '');
  return {
    id: sha256(a.url),
    headline: a.title,
    summary: a.description ?? '',
    url: a.url,
    source: a.source ?? 'TheNewsAPI',
    ingestedAt: new Date().toISOString(),
    hasNumber,
    domain,
    ingestSource: 'thenewsapi',
    tags: [],
    sourceArticle: a,
  };
}

async function fetchPage(url: string): Promise<StoryCandidate[]> {
  const raw = JSON.parse(await httpGet(url)) as { data?: TheNewsAPIArticle[] };
  return (raw.data ?? []).map(toCandidate);
}

// Fetches up to `maxPages` pages of /all?published_on={date} at limit=3 per page.
// Stops early if a page returns fewer than 3 results (end of available articles).
// Each page costs 1 API call.
async function ingestDate(token: string, date: string, maxPages: number): Promise<{ candidates: StoryCandidate[]; calls: number }> {
  const base = `https://api.thenewsapi.com/v1/news/all?api_token=${token}&locale=us&language=en&categories=general,science,politics,tech&limit=3&published_on=${date}`;
  const candidates: StoryCandidate[] = [];
  let calls = 0;

  for (let page = 1; page <= maxPages; page++) {
    const items = await fetchPage(`${base}&page=${page}`);
    calls++;
    candidates.push(...items);
    if (items.length < 3) break; // last page — no more results
    if (page < maxPages) await sleep(150);
  }

  return { candidates, calls };
}

async function main() {
  const daysArg = process.argv.find((a) => a.startsWith('--days='));
  const pagesArg = process.argv.find((a) => a.startsWith('--pages='));
  const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 1;
  const pagesPerDay = pagesArg ? parseInt(pagesArg.split('=')[1], 10) : 20;

  if (isNaN(days) || days < 1) throw new Error('--days must be a positive integer');
  if (isNaN(pagesPerDay) || pagesPerDay < 1) throw new Error('--pages must be a positive integer');

  const token = requireEnv('THENEWSAPI_TOKEN');

  // Budget note: weird ingest uses up to 15 calls for headline resolution.
  // This script uses up to (days × pagesPerDay) calls.
  // Default: 1 day × 20 pages = 20 calls here + ~15 weird = ~35 total (well within 100/day).
  // For bulk: --days=4 --pages=20 = 80 calls here + ~15 weird = ~95 total.
  console.log(`Ingesting from TheNewsAPI: ${days} day(s) × up to ${pagesPerDay} pages/day (limit=3 per page)...`);

  const allCandidates: StoryCandidate[] = [];
  let totalCalls = 0;

  for (let i = 0; i < days; i++) {
    const date = isoDate(i);
    process.stdout.write(`  ${date}... `);
    const { candidates, calls } = await ingestDate(token, date, pagesPerDay);
    process.stdout.write(`${candidates.length} articles (${calls} calls)\n`);
    allCandidates.push(...candidates);
    totalCalls += calls;
    if (i < days - 1) await sleep(250);
  }

  // Deduplicate by URL hash across all days
  const seen = new Set<string>();
  const candidates = allCandidates.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const out: CandidatesFile = { date: today(), candidates };
  const outPath = dataPath('candidates', `${today()}.json`);
  writeJson(outPath, out);

  const withNumbers = candidates.filter((c) => c.hasNumber).length;
  const bulkNote = days > 1 ? ` (${days}-day bulk)` : '';
  console.log(`\n✓ ${candidates.length} candidates${bulkNote} (${withNumbers} with numbers) → ${outPath}`);
  console.log(`  TheNewsAPI calls used: ${totalCalls}`);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
