import { loadEnv, requireEnv, httpGet, today, writeJson, dataPath, sha256 } from './utils';
import type { StoryCandidate, CandidatesFile } from './types';

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

async function ingestTheNewsAPI(): Promise<StoryCandidate[]> {
  const token = requireEnv('THENEWSAPI_TOKEN');
  const url = `https://api.thenewsapi.com/v1/news/top?api_token=${token}&locale=us&categories=general,science,politics,tech&limit=50`;
  const raw = JSON.parse(await httpGet(url)) as { data?: Array<{ title: string; description: string; url: string; source: string }> };
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
    };
  });
}

async function ingestWikipedia(): Promise<StoryCandidate[]> {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`;
  const raw = JSON.parse(
    await httpGet(url, { 'User-Agent': 'NoodleBowlPipeline/1.0 (rcsheng@gmail.com)' })
  ) as { events?: Array<{ text: string; year: number; pages?: Array<{ extract: string; content_urls?: { desktop?: { page?: string } } }> }> };
  const events = raw.events ?? [];

  return events.slice(0, 20).map((e): StoryCandidate => {
    const headline = `${e.year}: ${e.text}`;
    const summary = e.pages?.[0]?.extract ?? '';
    const wikiUrl = e.pages?.[0]?.content_urls?.desktop?.page ?? 'https://en.wikipedia.org';
    const { hasNumber, domain } = classify(headline, summary);
    return {
      id: sha256(wikiUrl + String(e.year)),
      headline,
      summary: summary.slice(0, 500),
      url: wikiUrl,
      source: 'Wikipedia',
      ingestedAt: new Date().toISOString(),
      hasNumber,
      domain,
      ingestSource: 'wikipedia',
    };
  });
}

async function main() {
  console.log('Ingesting from TheNewsAPI...');
  const newsItems = await ingestTheNewsAPI();
  console.log(`  ${newsItems.length} items`);

  console.log('Ingesting from Wikipedia "On This Day"...');
  const wikiItems = await ingestWikipedia();
  console.log(`  ${wikiItems.length} items`);

  const all = [...newsItems, ...wikiItems];
  const seen = new Set<string>();
  const candidates = all.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const out: CandidatesFile = { date: today(), candidates };
  const outPath = dataPath('candidates', `${today()}.json`);
  writeJson(outPath, out);

  const withNumbers = candidates.filter((c) => c.hasNumber).length;
  console.log(`\n✓ ${candidates.length} candidates (${withNumbers} with numbers) → ${outPath}`);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
