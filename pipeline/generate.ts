import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { loadEnv, requireEnv, readJson, writeJson, dataPath, extractJson, latestFile, today } from './utils';
import { loadSofRealClaims } from './db';
import type { SelectedFile, SofCluster, StoryCandidate } from './types';
import { ledeItemSchema, spreadItemSchema, sofItemSchema, contentBanksSchema } from './schemas';
import type { LedeItem, SpreadItem, SofItem } from '../constants/data';

loadEnv();

const SONNET = 'claude-sonnet-4-6';

const usage = { sonnetIn: 0, sonnetOut: 0 };

function loadPrompt(name: string): string {
  return fs.readFileSync(path.join(__dirname, 'prompts', `${name}.txt`), 'utf-8');
}

const SYSTEM = `You are a trivia question writer for a weekly news game called Noodle Bowl.
Generate factual content only. Never reproduce article text verbatim.
Return ONLY valid JSON matching the schema. No markdown, no code blocks, no prose.`;

async function callClaude(client: Anthropic, model: string, userContent: string): Promise<unknown> {
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: 'user', content: userContent }],
  });

  usage.sonnetIn += response.usage.input_tokens;
  usage.sonnetOut += response.usage.output_tokens;

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return extractJson(text);
}

function storyContext(s: StoryCandidate): string {
  return `Headline: "${s.headline}"\nContext: "${s.summary}"\nSource: ${s.source}`;
}

function candidateEventDate(s: StoryCandidate): string | undefined {
  if (s.sourceArticle?.published_at) {
    return new Date(s.sourceArticle.published_at).toLocaleDateString('en-US', {
      month: 'long', year: 'numeric',
    });
  }
  return undefined;
}

async function generateLede(client: Anthropic, s: StoryCandidate): Promise<LedeItem | null> {
  try {
    const raw = await callClaude(client, SONNET, loadPrompt('lede') + storyContext(s));
    if (raw && typeof raw === 'object' && 'skip' in raw) return null;
    const item = ledeItemSchema.parse(raw) as LedeItem;
    return { ...item, sourceHint: s.source, sourceUrl: s.url, eventDate: candidateEventDate(s) };
  } catch (e) {
    console.warn(`  [skip lede] ${s.headline.slice(0, 60)}: ${(e as Error).message.slice(0, 80)}`);
    return null;
  }
}

async function generateSpread(client: Anthropic, s: StoryCandidate): Promise<SpreadItem | null> {
  try {
    const raw = await callClaude(client, SONNET, loadPrompt('spread') + storyContext(s));
    if (raw && typeof raw === 'object' && 'skip' in raw) return null;
    const item = spreadItemSchema.parse(raw) as SpreadItem;
    return { ...item, sourceHint: s.source, sourceUrl: s.url, eventDate: candidateEventDate(s) };
  } catch (e) {
    console.warn(`  [skip spread] ${s.headline.slice(0, 60)}: ${(e as Error).message.slice(0, 80)}`);
    return null;
  }
}

/** Returns true if two topic strings share a meaningful keyword (used to avoid same-domain decoys). */
function topicsOverlap(a: string, b: string): boolean {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this']);
  const words = (s: string) =>
    s.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w));
  const wb = new Set(words(b));
  return words(a).some(w => wb.has(w));
}

async function generateSof(
  client: Anthropic,
  cluster: SofCluster,
  decoyFact: string | null,
): Promise<SofItem | null> {
  try {
    const s = cluster.stories[0];
    const storyText = `"${s.headline}" — ${s.summary} (source: ${s.source}, url: ${s.url})`;
    const decoySection = decoyFact
      ? `\nDecoy reference — a verified real-science fact from a different week and domain. ` +
        `Use it as the raw material for the fabricated claim: keep the authentic scientific ` +
        `register, but change specific details (organism, mechanism, numbers, or outcome) so ` +
        `the resulting claim is false. Do NOT copy it verbatim.\n"${decoyFact}"\n`
      : '';
    const raw = await callClaude(
      client,
      SONNET,
      loadPrompt('sof') + `Topic: ${cluster.domain}\n${decoySection}${storyText}`
    );
    if (raw && typeof raw === 'object' && 'skip' in raw) return null;
    const item = sofItemSchema.parse(raw) as SofItem;
    return { ...item, eventDate: candidateEventDate(cluster.stories[0]) };
  } catch (e) {
    console.warn(`  [skip sof] ${cluster.domain}: ${(e as Error).message.slice(0, 80)}`);
    return null;
  }
}

async function runBatch<T>(
  label: string,
  items: unknown[],
  fn: (item: never, index: number) => Promise<T | null>
): Promise<T[]> {
  process.stdout.write(`Generating ${items.length} ${label}... `);
  const results: T[] = [];
  for (let i = 0; i < items.length; i++) {
    const result = await fn(items[i] as never, i);
    if (result) results.push(result);
    process.stdout.write('.');
  }
  console.log(` ${results.length} ok`);
  return results;
}

function logCosts() {
  // Pricing as of 2025: Sonnet $3/$15 per MTok
  const sonnetCost = (usage.sonnetIn * 3 + usage.sonnetOut * 15) / 1_000_000;
  console.log(`\nTokens: Sonnet ${usage.sonnetIn}in/${usage.sonnetOut}out`);
  console.log(`Estimated cost: ~$${sonnetCost.toFixed(3)}`);
}

async function main() {
  const apiKey = requireEnv('ANTHROPIC_API_KEY');
  const client = new Anthropic({ apiKey });

  const filePath = process.env.PIPELINE_DATE
    ? dataPath('selected', `${process.env.PIPELINE_DATE}.json`)
    : latestFile(dataPath('selected'), 'Run pipeline:select first.');
  console.log(`Generating from ${path.basename(filePath)}\n`);
  const { lede: ledeStories, spread: spreadStories, sofClusters } = readJson<SelectedFile>(filePath);

  const ledeItems = await runBatch('Lede', ledeStories, (s) => generateLede(client, s));
  const spreadItems = await runBatch('Spread', spreadStories, (s) => generateSpread(client, s));

  // Load real SoF claims from past published dates to use as decoy material
  const decoyPool = loadSofRealClaims(today());
  if (decoyPool.length > 0) {
    console.log(`  Decoy pool: ${decoyPool.length} real SoF claims from history`);
  } else {
    console.log(`  Decoy pool: empty (first run or no history — fabricated claims will be LLM-only)`);
  }

  const sofItems = await runBatch('SoF', sofClusters, (c) => {
    const cluster = c as SofCluster;
    const candidates = decoyPool.filter(d => !topicsOverlap(d.topic, cluster.domain));
    const decoy = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)].text
      : null;
    return generateSof(client, cluster, decoy);
  });

  // quip and wave are not yet generated — published as empty arrays so app reads [] not undefined
  const banks = { lede: ledeItems, spread: spreadItems, sof: sofItems, quip: [], wave: [] };
  contentBanksSchema.parse(banks);

  const outPath = dataPath('generated', `${today()}.json`);
  writeJson(outPath, banks);

  console.log(`\n✓ Generated banks → ${outPath}`);
  console.log(`  lede: ${ledeItems.length}  spread: ${spreadItems.length}  sof: ${sofItems.length}`);

  if (ledeItems.length < 10) console.warn(`  WARNING: only ${ledeItems.length} Lede items`);
  if (spreadItems.length < 10) console.warn(`  WARNING: only ${spreadItems.length} Spread items`);
  if (sofItems.length < 10) console.warn(`  WARNING: only ${sofItems.length} SoF items (~${Math.floor(sofItems.length / 2)} sessions)`);

  logCosts();
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
