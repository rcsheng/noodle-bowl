/**
 * pipeline/ingest-web-historical.ts
 *
 * Web-search-assisted historical ingest. Uses Claude with the built-in
 * web_search tool to find real news articles with verified URLs for a
 * specific ISO week. Works for both 2025 weeks (within training data) and
 * 2026 weeks (post training-cutoff) because it searches the live web.
 *
 * Produces the same CandidatesFile format as ingest.ts so the rest of the
 * pipeline (select → generate → publish) is unchanged.
 *
 * Usage:
 *   ts-node pipeline/ingest-web-historical.ts --week=2025-W01
 *   ts-node pipeline/ingest-web-historical.ts --week=2026-W05
 *   (also called by pipeline/historical.ts with PIPELINE_DATE env var set)
 */

import Anthropic from '@anthropic-ai/sdk';
import { loadEnv, requireEnv, writeJson, dataPath, sha256 } from './utils';
import type { StoryCandidate, CandidatesFile, TheNewsAPIArticle } from './types';
import { isoWeekToMonday } from './ingest-llm-historical';

loadEnv();

// ─── Date helpers ─────────────────────────────────────────────────────────────

function mondayToSunday(monday: string): string {
  const d = new Date(monday + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().split('T')[0];
}

function monthYearLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
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
  const monthYear = monthYearLabel(start);
  return `You are a news research assistant. Use your web_search tool to find 60 real news stories published during the week of ${start} to ${end} (ISO week ${weekStr}).

Search strategy — run these searches (or close variants) before answering:
1. "top news stories ${monthYear}"
2. "week of ${start} news recap"
3. "politics government news ${monthYear}"
4. "business economy news ${monthYear}"
5. "technology AI news ${monthYear}"
6. "science health nature news ${monthYear}"
7. "culture entertainment sports news ${monthYear}"
8. "weird unusual funny news ${monthYear}"

For each story:
- Use a URL you actually found in your search results — not a guessed URL
- If you cannot find a real URL, skip that story and replace it with one you can verify
- Prefer primary sources (AP, Reuters, BBC, NYT, WaPo, Guardian, etc.)

Return a JSON array of exactly 60 objects. Each object must have:
- "headline": string — real headline or close paraphrase (under 120 chars)
- "summary": string — 2-4 sentences with specific factual details (150+ chars preferred)
- "url": string — real URL from your search results
- "source": string — news outlet name (e.g. "AP", "Reuters", "BBC", "NYT")
- "publishedDate": string — YYYY-MM-DD when published (aim for ${start}–${end}, but nearby dates ok)
- "hasNumber": boolean — true if the story contains a specific statistic, count, or monetary figure
- "domain": one of "science"|"health"|"nature"|"technology"|"politics"|"business"|"culture"|"general"
- "tags": string[] — use ["weird"] for unusual/offbeat/surprising stories, otherwise []

Target breakdown (flexible — quality over exact counts):
- 12 politics/government (elections, legislation, international affairs, court decisions)
- 12 business/economy (earnings, mergers, market moves, economic data)
- 10 technology (AI, Big Tech, cybersecurity, space, EVs)
- 10 science/health/nature (studies, discoveries, outbreaks, environment)
- 8 culture/entertainment (films, music, sports records, awards)
- 8 weird/offbeat (tag with "weird")

Return ONLY the JSON array. No markdown, no code blocks, no prose.`;
}

// ─── Agentic tool-use loop ────────────────────────────────────────────────────

interface WebSearchUsage {
  inputTokens: number;
  outputTokens: number;
}

async function runWithWebSearch(client: Anthropic, prompt: string): Promise<{ text: string; usage: WebSearchUsage }> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: prompt },
  ];
  const usage: WebSearchUsage = { inputTokens: 0, outputTokens: 0 };

  // web_search_20250305 is Anthropic's built-in server-side search tool.
  // Claude calls it multiple times; the API executes searches and injects results.
  const tools = [
    {
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 15,
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any[];

  const MAX_ITERATIONS = 25;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.messages.create as any)({
      model: 'claude-sonnet-4-6',
      max_tokens: 16_000,
      tools,
      messages,
    });

    usage.inputTokens += response.usage?.input_tokens ?? 0;
    usage.outputTokens += response.usage?.output_tokens ?? 0;

    if (response.stop_reason === 'end_turn') {
      // Collect all text blocks from the final response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = (response.content as any[])
        .filter((b: { type: string }) => b.type === 'text')
        .map((b: { text: string }) => b.text)
        .join('');
      return { text, usage };
    }

    if (response.stop_reason === 'tool_use') {
      // Add assistant turn to conversation history
      messages.push({ role: 'assistant', content: response.content });

      // For web_search_20250305 (server-side tool), the search is executed by
      // Anthropic's infrastructure. We send back acknowledgment tool_result
      // blocks; the API injects the real search results into the next response.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolResults = (response.content as any[])
        .filter((b: { type: string }) => b.type === 'tool_use')
        .map((b: { id: string }) => ({
          type: 'tool_result' as const,
          tool_use_id: b.id,
          content: '',
        }));

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // max_tokens or other stop — grab whatever text we have
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const partial = (response.content as any[])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('');
    if (partial) return { text: partial, usage };

    throw new Error(`Unexpected stop_reason: ${response.stop_reason}`);
  }

  throw new Error(`Web search loop did not complete after ${MAX_ITERATIONS} iterations`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const weekArg = process.argv.find(a => a.startsWith('--week='))?.split('=')[1];

  if (!weekArg) {
    console.error('Usage: ingest-web-historical.ts --week=YYYY-WNN');
    process.exit(1);
  }

  const apiKey = requireEnv('ANTHROPIC_API_KEY');
  const client = new Anthropic({ apiKey });

  const monday = isoWeekToMonday(weekArg);
  const sunday = mondayToSunday(monday);
  console.log(`Web-searching candidates for ${weekArg} (${monday} → ${sunday})`);

  const { text, usage } = await runWithWebSearch(client, buildPrompt(weekArg, monday, sunday));

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) throw new Error('Response did not contain a JSON array');

  let llmItems: LLMCandidate[];
  try {
    llmItems = JSON.parse(arrayMatch[0]) as LLMCandidate[];
  } catch (e) {
    throw new Error(`Failed to parse response as JSON: ${(e as Error).message}`);
  }

  console.log(`  Found ${llmItems.length} raw candidates`);

  const candidates: StoryCandidate[] = llmItems
    .filter(item => item.headline && item.summary && item.url)
    .map(item => {
      const published_at = item.publishedDate
        ? new Date(item.publishedDate).toISOString()
        : new Date(monday).toISOString();

      // Use headline-based ID so that multiple stories pointing to the same
      // aggregator/roundup URL (common in web-search results) are preserved
      // rather than collapsed by URL-hash dedup.
      const storyId = sha256(item.headline.toLowerCase().trim());

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
        id: storyId,
        headline: item.headline,
        summary: item.summary,
        url: item.url,
        source: item.source,
        ingestedAt: new Date().toISOString(),
        hasNumber: item.hasNumber ?? false,
        domain: item.domain ?? 'general',
        ingestSource: 'web-historical' as const,
        tags: Array.isArray(item.tags) ? item.tags : [],
        sourceArticle,
      };
    });

  // Deduplicate by headline hash (IDs are headline-based for web-historical)
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

  // Pricing as of 2025: Sonnet $3/$15 per MTok (web_search tool billed same as standard tokens)
  const ingestCost = (usage.inputTokens * 3 + usage.outputTokens * 15) / 1_000_000;
  console.log(`✓ ${unique.length} candidates (${withNumbers} with numbers, ${weird} weird)`);
  console.log(`  domains: ${byDomain}`);
  console.log(`  Tokens: Sonnet ${usage.inputTokens}in/${usage.outputTokens}out  (~$${ingestCost.toFixed(3)} ingest)`);
  console.log(`  → ${outPath}`);
}

if (require.main === module) {
  main().catch((err: Error) => {
    console.error(err.message);
    process.exit(1);
  });
}
