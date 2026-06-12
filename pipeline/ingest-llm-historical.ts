/**
 * pipeline/ingest-llm-historical.ts
 *
 * Generates story candidates for a specific past ISO week by asking Claude to recall
 * real news events from that period. Produces the same CandidatesFile format as
 * ingest.ts, so the rest of the pipeline (select → generate → publish) is unchanged.
 *
 * Stories are real events from Claude's training data — not fabricated.
 * Source URLs are approximate (same caveat as the hand-researched .md files).
 *
 * Usage:
 *   ts-node pipeline/ingest-llm-historical.ts --week=2025-W01
 *   (also called by pipeline/historical.ts with PIPELINE_DATE env var set)
 */

import Anthropic from '@anthropic-ai/sdk';
import { loadEnv, requireEnv, writeJson, dataPath, sha256 } from './utils';
import type { StoryCandidate, CandidatesFile, TheNewsAPIArticle } from './types';

loadEnv();

// ─── ISO week helpers ────────────────────────────────────────────────────────

/** Returns the Monday date (YYYY-MM-DD) for a given ISO week string like "2025-W01". */
export function isoWeekToMonday(weekStr: string): string {
  const m = weekStr.match(/^(\d{4})-W(\d{2})$/);
  if (!m) throw new Error(`Invalid ISO week format: ${weekStr}. Expected YYYY-WNN.`);
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);
  // Jan 4 is always in W1 of its year (ISO 8601 rule)
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // 1=Mon ... 7=Sun
  const monday = new Date(jan4.getTime() - (jan4Day - 1) * 86_400_000 + (week - 1) * 7 * 86_400_000);
  return monday.toISOString().split('T')[0];
}

/** Returns the Sunday date for a given Monday date. */
function mondayToSunday(monday: string): string {
  const d = new Date(monday + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().split('T')[0];
}

// ─── LLM candidate shape ─────────────────────────────────────────────────────

interface LLMCandidate {
  headline: string;
  summary: string;
  url: string;
  source: string;
  publishedDate: string;
  hasNumber: boolean;
  domain: 'science' | 'health' | 'nature' | 'technology' | 'politics' | 'business' | 'culture' | 'general';
  tags: string[];
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

function buildPrompt(weekStr: string, start: string, end: string): string {
  return `You are a news research assistant. Generate exactly 60 real news story candidates from the week of ${start} to ${end} (ISO week ${weekStr}).

IMPORTANT: These MUST be real events that actually occurred during this specific week. Draw on your training data to recall accurate, factual stories. Do not invent or fabricate stories.

Return a JSON array of exactly 60 objects. Each object must have these fields:
- "headline": string — the actual news headline or a close paraphrase (under 120 chars)
- "summary": string — 2-4 sentences of factual context with specific details (150+ chars preferred)
- "url": string — approximate URL, e.g. "https://apnews.com/article/[slug-words]"
- "source": string — news outlet name, e.g. "AP", "Reuters", "BBC", "The Guardian", "NYT", "Washington Post"
- "publishedDate": string — YYYY-MM-DD when this story was published (within the week range)
- "hasNumber": boolean — true if the story contains a specific statistic, measurement, count, or monetary figure
- "domain": one of "science" | "health" | "nature" | "technology" | "politics" | "business" | "culture" | "general"
- "tags": string[] — use ["weird"] for unusual/offbeat/surprising stories, otherwise []

Breakdown targets (flexible, prioritise quality over exact counts):
- 12 politics/government (elections, legislation, international affairs, court decisions)
- 12 business/economy (earnings, mergers, market moves, economic data)
- 10 technology (AI, Big Tech, cybersecurity, space, EVs)
- 10 science/health/nature (studies, discoveries, outbreaks, environment — prefer stories with specific numbers)
- 8 culture/entertainment (films, music, sports records, awards, viral moments)
- 8 weird/offbeat (unusual events, surprising facts, quirky stories — tag with "weird")

Quality bar for each story:
1. Factually accurate — only include events you are confident happened that week
2. Specific — include names, numbers, places (vague summaries are not useful)
3. Interesting — pick stories a general-knowledge game player would find engaging

Return ONLY the JSON array. No markdown, no explanations, no code blocks.`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const weekArg = process.argv.find(a => a.startsWith('--week='))?.split('=')[1]
    ?? (process.env.PIPELINE_DATE ? undefined : undefined);

  if (!weekArg) {
    console.error('Usage: ingest-llm-historical.ts --week=YYYY-WNN');
    process.exit(1);
  }

  const apiKey = requireEnv('ANTHROPIC_API_KEY');
  const client = new Anthropic({ apiKey });

  const monday = isoWeekToMonday(weekArg);
  const sunday = mondayToSunday(monday);
  console.log(`Generating candidates for ${weekArg} (${monday} → ${sunday})`);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16_000,
    messages: [{ role: 'user', content: buildPrompt(weekArg, monday, sunday) }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]';

  // Extract JSON array — handle any leading/trailing prose
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) throw new Error('Claude response did not contain a JSON array');

  let llmItems: LLMCandidate[];
  try {
    llmItems = JSON.parse(arrayMatch[0]) as LLMCandidate[];
  } catch (e) {
    throw new Error(`Failed to parse Claude response as JSON: ${(e as Error).message}`);
  }

  console.log(`  Claude returned ${llmItems.length} raw candidates`);

  // Convert to StoryCandidate format
  const candidates: StoryCandidate[] = llmItems
    .filter(item => item.headline && item.summary && item.url)
    .map(item => {
      const published_at = item.publishedDate
        ? new Date(item.publishedDate).toISOString()
        : new Date(monday).toISOString();

      const sourceArticle: TheNewsAPIArticle = {
        uuid: sha256(item.url),
        title: item.headline,
        description: item.summary,
        snippet: item.summary,
        url: item.url,
        image_url: null,
        language: 'en',
        published_at,
        source: item.source,
        categories: [item.domain],
        locale: 'us',
        relevance_score: null,
        keywords: null,
      };

      return {
        id: sha256(item.url),
        headline: item.headline,
        summary: item.summary,
        url: item.url,
        source: item.source,
        ingestedAt: new Date().toISOString(),
        hasNumber: item.hasNumber ?? false,
        domain: item.domain ?? 'general',
        ingestSource: 'llm-historical' as const,
        tags: Array.isArray(item.tags) ? item.tags : [],
        sourceArticle,
      };
    });

  // Deduplicate by URL hash
  const seen = new Set<string>();
  const unique = candidates.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const outPath = dataPath('candidates', `${monday}.json`);
  writeJson(outPath, { date: monday, candidates: unique } satisfies CandidatesFile);

  const withNumbers = unique.filter(c => c.hasNumber).length;
  const weird = unique.filter(c => c.tags.includes('weird')).length;
  const byDomain = Object.entries(
    unique.reduce<Record<string, number>>((acc, c) => {
      acc[c.domain] = (acc[c.domain] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([d, n]) => `${d}:${n}`).join(' ');

  console.log(`✓ ${unique.length} candidates (${withNumbers} with numbers, ${weird} weird)`);
  console.log(`  domains: ${byDomain}`);
  console.log(`  → ${outPath}`);
}

if (require.main === module) {
  main().catch((err: Error) => {
    console.error(err.message);
    process.exit(1);
  });
}
