// Scrapes "weird/offbeat" story headlines from curated sources (RSS and HTML),
// then resolves each to a real news article via TheNewsAPI keyword search.
// Outputs CandidatesFile to pipeline/data/candidates/YYYY-MM-DD-weird.json.
// select.ts automatically merges these when present and boosts their Lede score.

import { loadEnv, requireEnv, httpGet, today, writeJson, dataPath, sha256 } from './utils';
import type { StoryCandidate, CandidatesFile, TheNewsAPIArticle } from './types';

loadEnv();

// Browser-like UA avoids 403s on sites that block obvious bot agents.
const SCRAPER_UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

// --- Domain classification (mirrors ingest.ts) ---

const NUMBER_PATTERN =
  /\b\d[\d,.]*\s*(million|billion|trillion|thousand|percent|%|km|miles|kg|lbs|days|years|hours|seconds|mph)?\b/i;

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  science: ['research', 'study', 'scientists', 'space', 'climate', 'medical', 'biology', 'physics', 'AI', 'genome', 'vaccine'],
  nature: ['animal', 'species', 'ocean', 'forest', 'wildlife', 'plant', 'insect', 'whale', 'bird', 'coral'],
  politics: ['congress', 'senate', 'president', 'election', 'government', 'policy', 'law', 'court', 'vote'],
  business: ['company', 'CEO', 'stock', 'market', 'startup', 'economy', 'trade', 'merger', 'IPO'],
  technology: ['software', 'app', 'robot', 'drone', 'chip', 'cybersecurity', 'hack', 'data', 'internet'],
  culture: ['film', 'music', 'art', 'book', 'sport', 'food', 'fashion', 'museum', 'award', 'record'],
};

function classify(headline: string, summary: string): { hasNumber: boolean; domain: string } {
  const text = `${headline} ${summary}`;
  const hasNumber = NUMBER_PATTERN.test(text);
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((kw) => text.toLowerCase().includes(kw.toLowerCase()))) return { hasNumber, domain };
  }
  return { hasNumber, domain: 'general' };
}

// --- Text helpers ---

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'is', 'was', 'are', 'were', 'be', 'been', 'has', 'have', 'had', 'that', 'this', 'it', 'its',
  'they', 'their', 'after', 'over', 'into', 'about', 'says', 'said', 'new', 'year', 'years',
  'day', 'days', 'time', 'now', 'more', 'than', 'most', 'some', 'all', 'not', 'just', 'can',
  'could', 'will', 'would', 'should', 'what', 'how', 'when', 'where', 'who', 'why', 'which',
]);

function extractKeyTerms(headline: string, maxWords = 4): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
    .slice(0, maxWords)
    .join(' ');
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Headline extractors ---

type ScrapedHeadline = { headline: string; scrapedFrom: string };

/** Extracts headlines from h2-h5 tags in HTML pages (e.g. AP News). */
function extractHTMLHeadlines(html: string, limit = 20): string[] {
  const results: string[] = [];
  const re = /<h[2-5][^>]*>([\s\S]*?)<\/h[2-5]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = decodeEntities(m[1].replace(/<[^>]+>/g, ''));
    if (text.length >= 20 && text.length <= 200) results.push(text);
    if (results.length >= limit) break;
  }
  return [...new Set(results)];
}

/** Extracts headlines from RSS/Atom feeds. Handles both plain and CDATA-wrapped titles.
 *  Skips the first <title> (the channel/feed title itself). */
function extractRSSHeadlines(xml: string, limit = 20): string[] {
  const results: string[] = [];
  // Match each <item> or <entry> block
  const itemRe = /<(?:item|entry)[\s>][\s\S]*?<\/(?:item|entry)>/gi;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemRe.exec(xml)) !== null) {
    const block = itemMatch[0];
    // Extract <title>, handling optional CDATA wrapper
    const titleMatch = /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(block);
    if (titleMatch) {
      const text = decodeEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim());
      if (text.length >= 20 && text.length <= 200) results.push(text);
    }
    if (results.length >= limit) break;
  }
  return [...new Set(results)];
}

async function fetchHTMLSource(url: string, scrapedFrom: string, limit = 20): Promise<ScrapedHeadline[]> {
  const html = await httpGet(url, SCRAPER_UA);
  return extractHTMLHeadlines(html, limit).map((headline) => ({ headline, scrapedFrom }));
}

async function fetchRSSSource(url: string, scrapedFrom: string, limit = 20): Promise<ScrapedHeadline[]> {
  const xml = await httpGet(url, SCRAPER_UA);
  return extractRSSHeadlines(xml, limit).map((headline) => ({ headline, scrapedFrom }));
}

// --- TheNewsAPI resolver ---

async function resolveViaNewsAPI(headline: string, token: string): Promise<StoryCandidate | null> {
  const terms = extractKeyTerms(headline);
  if (!terms) return null;

  const url = `https://api.thenewsapi.com/v1/news/all?api_token=${token}&search=${encodeURIComponent(terms)}&language=en&locale=us&limit=1`;
  const raw = JSON.parse(await httpGet(url)) as { data?: TheNewsAPIArticle[] };
  const articles = raw.data ?? [];
  if (!articles.length) return null;

  const a = articles[0];
  if (!a.description || a.description.length < 40) return null;

  const { hasNumber, domain } = classify(a.title, a.description);

  return {
    id: sha256(a.url),
    headline: a.title,
    summary: a.description,
    url: a.url,
    source: a.source ?? 'TheNewsAPI',
    ingestedAt: new Date().toISOString(),
    hasNumber,
    domain,
    ingestSource: 'thenewsapi',
    tags: ['weird'],
    sourceArticle: a,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Sources are tried in order; failures are non-fatal (logged and skipped).
// RSS is preferred over HTML where available — more stable than page structure.
const SOURCES: Array<{ name: string; fetch: () => Promise<ScrapedHeadline[]> }> = [
  // HTML scrapers
  {
    name: 'apnews/oddities',
    fetch: () => fetchHTMLSource('https://apnews.com/oddities', 'apnews/oddities'),
  },
  // RSS feeds — more reliable than scraping HTML pages
  {
    name: 'npr/strange-news',
    fetch: () => fetchRSSSource('https://feeds.npr.org/1146/rss.xml', 'npr/strange-news'),
  },
  {
    name: 'sky/strange',
    fetch: () => fetchRSSSource('http://feeds.skynews.com/feeds/rss/strange.xml', 'sky/strange'),
  },
  {
    name: 'upi/odd-news',
    fetch: () => fetchRSSSource('https://rss.upi.com/news/odd_news.rss', 'upi/odd-news'),
  },
  {
    name: 'mentalfloss',
    fetch: () => fetchRSSSource('https://mentalfloss.com/rss.xml', 'mentalfloss'),
  },
  {
    name: 'neatorama',
    fetch: () => fetchRSSSource('https://www.neatorama.com/feed/', 'neatorama'),
  },
  {
    name: 'fark',
    fetch: () => fetchRSSSource('https://www.fark.com/fark.rss', 'fark'),
  },
];

async function main() {
  const token = requireEnv('THENEWSAPI_TOKEN');

  // Scrape headlines from all sources (failures are non-fatal; 10s timeout per request)
  console.log('Scraping weird news sources...');
  const allHeadlines: ScrapedHeadline[] = [];
  for (const { name, fetch: fetchSource } of SOURCES) {
    process.stdout.write(`  ${name}... `);
    let items: ScrapedHeadline[] = [];
    try {
      items = await fetchSource();
      console.log(`${items.length} headlines`);
    } catch (e) {
      console.log(`skipped (${(e as Error).message.slice(0, 60)})`);
    }
    allHeadlines.push(...items);
    await sleep(300);
  }
  console.log(`\nTotal: ${allHeadlines.length} headlines scraped`);

  if (!allHeadlines.length) {
    console.log('No headlines scraped — nothing to resolve.');
    return;
  }

  // Search TheNewsAPI for each scraped headline (one call per headline)
  console.log(`\nResolving via TheNewsAPI search...`);
  const candidates: StoryCandidate[] = [];
  const seen = new Set<string>();
  let apiCalls = 0;

  for (let i = 0; i < allHeadlines.length; i++) {
    const { headline } = allHeadlines[i];
    process.stdout.write(`  [${i + 1}/${allHeadlines.length}] ${headline.slice(0, 50).padEnd(50)} `);

    let candidate: StoryCandidate | null = null;
    try {
      candidate = await resolveViaNewsAPI(headline, token);
      apiCalls++;
    } catch (e) {
      console.log(`err (${(e as Error).message.slice(0, 50)})`);
      continue;
    }

    if (candidate && !seen.has(candidate.id)) {
      seen.add(candidate.id);
      candidates.push(candidate);
      console.log('✓');
    } else {
      console.log('·');
    }

    await sleep(200);
  }

  console.log(`\n${candidates.length} resolved from ${allHeadlines.length} scraped (${apiCalls} API calls used)`);

  const out: CandidatesFile = { date: today(), candidates };
  const outPath = dataPath('candidates', `${today()}-weird.json`);
  writeJson(outPath, out);
  console.log(`✓ Written to ${outPath}`);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
