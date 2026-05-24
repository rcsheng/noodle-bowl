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

async function fetchFromUrl(url: string, token: string): Promise<StoryCandidate[]> {
  const raw = JSON.parse(await httpGet(url)) as { data?: TheNewsAPIArticle[] };
  const articles = raw.data ?? [];
  return articles.map((a): StoryCandidate => {
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
  });
}

async function ingestTheNewsAPI(date?: string): Promise<StoryCandidate[]> {
  const token = requireEnv('THENEWSAPI_TOKEN');
  const base = `api_token=${token}&locale=us&categories=general,science,politics,tech&limit=50`;

  if (!date) {
    // Today: call both /top (importance-ranked) and /all?published_on=today,
    // then deduplicate by URL hash so we maximise volume without losing ranked articles.
    const today = isoDate(0);
    const [topItems, allItems] = await Promise.all([
      fetchFromUrl(`https://api.thenewsapi.com/v1/news/top?${base}`, token),
      fetchFromUrl(`https://api.thenewsapi.com/v1/news/all?${base}&published_on=${today}`, token),
    ]);
    const seen = new Set(topItems.map((a) => a.id));
    const merged = [...topItems, ...allItems.filter((a) => !seen.has(a.id))];
    return merged;
  }

  // Historical date: /all is the only option
  return fetchFromUrl(
    `https://api.thenewsapi.com/v1/news/all?${base}&published_on=${date}`,
    token,
  );
}

async function main() {
  const daysArg = process.argv.find((a) => a.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 1;
  if (isNaN(days) || days < 1) throw new Error('--days must be a positive integer');

  const allCandidates: StoryCandidate[] = [];

  const label = days === 1 ? 'today' : `${days} days`;
  // NOTE: today costs 2 TheNewsAPI calls (/top + /all); each historical day costs 1 (/all).
  // Total for --days=N: N+1 calls. Free tier: 100/day, so --days=60 uses 61 calls.
  console.log(`Ingesting from TheNewsAPI for ${label}...`);
  for (let i = 0; i < days; i++) {
    const date = isoDate(i);
    process.stdout.write(`  ${date}... `);
    // Today (i=0): calls both /top + /all and merges; historical dates: /all only
    const newsItems = await ingestTheNewsAPI(i === 0 ? undefined : date);
    process.stdout.write(`${newsItems.length}\n`);
    allCandidates.push(...newsItems);
    if (i < days - 1) await sleep(250);
  }

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
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
