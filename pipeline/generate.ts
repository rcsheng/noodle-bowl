import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { loadEnv, requireEnv, readJson, writeJson, dataPath, extractJson, latestFile, today } from './utils';
import type { SelectedFile, SofCluster, StoryCandidate } from './types';
import { ledeItemSchema, spreadItemSchema, sofItemSchema, contentBanksSchema } from './schemas';
import type { LedeItem, SpreadItem, SofItem } from '../constants/data';

loadEnv();

const SONNET = 'claude-sonnet-4-6';

const usage = { sonnetIn: 0, sonnetOut: 0 };

function loadPrompt(name: string): string {
  return fs.readFileSync(path.join(__dirname, 'prompts', `${name}.txt`), 'utf-8');
}

const SYSTEM = `You are a trivia question writer for a daily news game called Noodle Bowl.
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

async function generateLede(client: Anthropic, s: StoryCandidate): Promise<LedeItem | null> {
  try {
    const raw = await callClaude(client, SONNET, loadPrompt('lede') + storyContext(s));
    if (raw && typeof raw === 'object' && 'skip' in raw) return null;
    return ledeItemSchema.parse(raw) as LedeItem;
  } catch (e) {
    console.warn(`  [skip lede] ${s.headline.slice(0, 60)}: ${(e as Error).message.slice(0, 80)}`);
    return null;
  }
}

async function generateSpread(client: Anthropic, s: StoryCandidate): Promise<SpreadItem | null> {
  try {
    const raw = await callClaude(client, SONNET, loadPrompt('spread') + storyContext(s));
    return spreadItemSchema.parse(raw) as SpreadItem;
  } catch (e) {
    console.warn(`  [skip spread] ${s.headline.slice(0, 60)}: ${(e as Error).message.slice(0, 80)}`);
    return null;
  }
}

async function generateSof(client: Anthropic, cluster: SofCluster, weird: boolean): Promise<SofItem | null> {
  try {
    const storiesText = cluster.stories
      .slice(0, 2)
      .map((s, i) => `${i + 1}. "${s.headline}" — ${s.summary} (source: ${s.source}, url: ${s.url})`)
      .join('\n');
    const raw = await callClaude(
      client,
      SONNET,
      loadPrompt(weird ? 'sof-weird' : 'sof') + `Topic cluster: ${cluster.domain}\n${storiesText}`
    );
    if (raw && typeof raw === 'object' && 'skip' in raw) return null;
    return sofItemSchema.parse(raw) as SofItem;
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

  const filePath = latestFile(dataPath('selected'), 'Run pipeline:select first.');
  console.log(`Generating from ${path.basename(filePath)}\n`);
  const { lede: ledeStories, spread: spreadStories, sofClusters } = readJson<SelectedFile>(filePath);

  const ledeItems = await runBatch('Lede', ledeStories, (s) => generateLede(client, s));
  const spreadItems = await runBatch('Spread', spreadStories, (s) => generateSpread(client, s));
  // Alternate weird/standard so the bank is ~50/50 weirdAndTrue across clusters
  const sofItems = await runBatch('SoF', sofClusters, (c, i) => generateSof(client, c, i % 2 === 1));

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
