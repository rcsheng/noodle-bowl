import * as fs from 'fs';
import * as path from 'path';
import { today, writeJson, dataPath, sha256 } from './utils';
import type { StoryCandidate, CandidatesFile, TheNewsAPIArticle } from './types';

// Parses hand-researched markdown tables (pipe-delimited) and produces StoryCandidate objects.
// Expected columns: Episode Date | Title (Guest) | Segment | Quoted Headline | Source (Outlet) | Source URL | Publication Date | Notes

const NUMBER_PATTERN = /\b\d[\d,.]*\s*(million|billion|trillion|thousand|percent|%|km|miles|kg|lbs|days|years|hours|seconds|mph)?\b/i;

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  science: ['research', 'study', 'scientists', 'space', 'climate', 'medical', 'biology', 'physics', 'ai', 'genome', 'vaccine', 'covid', 'dogs detect'],
  nature: ['animal', 'species', 'ocean', 'wildlife', 'lobster', 'coyote', 'kiwi', 'sea lion'],
  politics: ['congress', 'senate', 'president', 'election', 'government', 'policy', 'law', 'court', 'vote', 'trump', 'musk', 'military', 'parade', 'faa'],
  business: ['company', 'ceo', 'stock', 'market', 'airline', 'bankruptcy', 'spirit', 'bezos'],
  technology: ['app', 'robot', 'chip', 'cybersecurity', 'smartwatch', 'data', 'internet', 'toothbrush'],
  culture: ['music', 'festival', 'art', 'book', 'sport', 'food', 'hotel', 'funeral', 'wedding', 'radio', 'wkrp'],
};

function classify(text: string): { hasNumber: boolean; domain: string } {
  const lower = text.toLowerCase();
  const hasNumber = NUMBER_PATTERN.test(text);
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return { hasNumber, domain };
  }
  return { hasNumber, domain: 'general' };
}

function extractLinkText(cell: string): string | null {
  const match = cell.match(/\[([^\]]+)\]/);
  if (!match) return null;
  // Strip outlet prefix like "Guardian: " or "Reuters: "
  return match[1].replace(/^[A-Za-z\s]+:\s*/, '').trim();
}

function extractLinkUrl(cell: string): string | null {
  const match = cell.match(/\]\(([^)]+)\)/);
  return match ? match[1].trim() : null;
}

function stripCitations(text: string): string {
  return text
    .replace(/【[^】]*】/g, '')
    .replace(/\*/g, '')
    .replace(/^[*("]+|[*)"]+$/g, '')
    .trim();
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseIsoDate(dateStr: string): string | undefined {
  const full = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
  if (full) return new Date(full[1]).toISOString();
  // "Jul 2025" or "July 2025" → YYYY-MM-01
  const monthYear = dateStr.match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/);
  if (monthYear) {
    const mm = MONTH_MAP[monthYear[1].toLowerCase()];
    if (mm) return new Date(`${monthYear[2]}-${mm}-01`).toISOString();
  }
  return undefined;
}

type ColIdx = { segment: number; quoted: number; outlet: number; url: number; date: number };

function detectColumns(cells: string[]): ColIdx | null {
  const lower = cells.map(c => c.toLowerCase());
  const segIdx = lower.findIndex(c => c === 'segment');
  if (segIdx === -1) return null;
  const find = (...kws: string[]) => lower.findIndex(c => kws.some(k => c.includes(k)));
  return {
    segment: segIdx,
    quoted: find('quoted headline', 'quoted text'),
    outlet: find('source (outlet)'),
    url: find('original article url', 'source url'),
    date: find('publication date'),
  };
}

function parseTable(mdPath: string): StoryCandidate[] {
  const candidates: StoryCandidate[] = [];
  let col: ColIdx | null = null;

  for (const line of fs.readFileSync(mdPath, 'utf-8').split('\n')) {
    if (!line.startsWith('|')) continue;
    if (/\|[-\s|]+\|/.test(line)) continue; // separator row
    const cells = line.split('|').slice(1, -1).map(c => c.trim());

    if (!col) {
      col = detectColumns(cells);
      continue; // header row consumed
    }

    const get = (i: number) => (i >= 0 && i < cells.length ? cells[i] : '');
    const segment = get(col.segment);
    const quotedCol = get(col.quoted);
    const outletCol = get(col.outlet);
    const urlCol = get(col.url);
    const dateCol = get(col.date);

    if (!segment) continue;

    const url = extractLinkUrl(urlCol);
    if (!url?.startsWith('http')) continue;

    const linkTitle = extractLinkText(urlCol);
    const quotedText = stripCitations(quotedCol);
    const headline = (linkTitle && linkTitle.length > 10) ? linkTitle : quotedText;
    const summary = quotedText.length > 10 ? quotedText : headline;
    if (headline.length < 5) continue;

    const isWeird = /bluff the listener/i.test(segment);
    const { hasNumber, domain } = classify(`${headline} ${summary}`);
    const published_at = parseIsoDate(dateCol);
    const source = stripCitations(outletCol);

    const sourceArticle: TheNewsAPIArticle | undefined = published_at ? {
      uuid: sha256(url),
      title: headline,
      description: summary,
      snippet: summary,
      url,
      image_url: null,
      language: 'en',
      published_at,
      source,
      categories: [domain],
      locale: 'us',
      relevance_score: null,
      keywords: null,
    } : undefined;

    candidates.push({
      id: sha256(url),
      headline,
      summary,
      url,
      source,
      ingestedAt: new Date().toISOString(),
      hasNumber,
      domain,
      ingestSource: 'researched',
      tags: isWeird ? ['weird'] : [],
      sourceArticle,
    });
  }

  return candidates;
}

function main() {
  const researchedDir = path.join(__dirname, 'data', 'researched');
  const mdFiles = fs.existsSync(researchedDir)
    ? fs.readdirSync(researchedDir).filter(f => f.endsWith('.md'))
    : [];

  if (!mdFiles.length) {
    console.log('No .md files in pipeline/data/researched/ — nothing to do.');
    return;
  }

  const seen = new Set<string>();
  const candidates: StoryCandidate[] = [];

  for (const file of mdFiles) {
    process.stdout.write(`Parsing ${file}... `);
    const parsed = parseTable(path.join(researchedDir, file));
    const fresh = parsed.filter(c => !seen.has(c.id));
    const dupes = parsed.length - fresh.length;
    fresh.forEach(c => seen.add(c.id));
    candidates.push(...fresh);
    const dupNote = dupes > 0 ? ` (${dupes} dupe${dupes > 1 ? 's' : ''} skipped)` : '';
    console.log(`${parsed.length} rows → ${fresh.length} new${dupNote}`);
  }

  const outPath = dataPath('candidates', `${today()}-researched.json`);
  writeJson(outPath, { date: today(), candidates } satisfies CandidatesFile);

  const weird = candidates.filter(c => c.tags.includes('weird')).length;
  console.log(`\n✓ ${candidates.length} candidates (${weird} weird) → ${outPath}`);
}

main();
