import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { loadEnv, requireEnv, readJson, writeJson, dataPath, extractJson, latestFile, today } from './utils';
import type { SelectedFile, SofCluster, StoryCandidate } from './types';
import { ledeItemSchema, spreadItemSchema, sofItemSchema, quipPromptSchema, waveItemSchema, contentBanksSchema } from './schemas';
import type { LedeItem, SpreadItem, SofItem, QuipPrompt, WaveItem } from '../constants/data';

loadEnv();

const SONNET = 'claude-sonnet-4-6';
const HAIKU = 'claude-haiku-4-5-20251001';

const usage = { sonnetIn: 0, sonnetOut: 0, haikuIn: 0, haikuOut: 0 };

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

  if (model === HAIKU) {
    usage.haikuIn += response.usage.input_tokens;
    usage.haikuOut += response.usage.output_tokens;
  } else {
    usage.sonnetIn += response.usage.input_tokens;
    usage.sonnetOut += response.usage.output_tokens;
  }

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return extractJson(text);
}

function storyContext(s: StoryCandidate): string {
  return `Headline: "${s.headline}"\nContext: "${s.summary}"\nSource: ${s.source}`;
}

async function generateLede(client: Anthropic, s: StoryCandidate): Promise<LedeItem | null> {
  try {
    const raw = await callClaude(client, SONNET, loadPrompt('lede') + storyContext(s));
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

async function generateSof(client: Anthropic, cluster: SofCluster): Promise<SofItem | null> {
  try {
    const storiesText = cluster.stories
      .slice(0, 2)
      .map((s, i) => `${i + 1}. "${s.headline}" — ${s.summary} (source: ${s.source}, url: ${s.url})`)
      .join('\n');
    const raw = await callClaude(
      client,
      SONNET,
      loadPrompt('sof') + `Topic cluster: ${cluster.domain}\n${storiesText}`
    );
    return sofItemSchema.parse(raw) as SofItem;
  } catch (e) {
    console.warn(`  [skip sof] ${cluster.domain}: ${(e as Error).message.slice(0, 80)}`);
    return null;
  }
}

async function generateQuip(client: Anthropic, s: StoryCandidate): Promise<QuipPrompt | null> {
  try {
    const raw = await callClaude(client, HAIKU, loadPrompt('quip') + storyContext(s));
    return quipPromptSchema.parse(raw) as QuipPrompt;
  } catch (e) {
    console.warn(`  [skip quip] ${s.headline.slice(0, 60)}: ${(e as Error).message.slice(0, 80)}`);
    return null;
  }
}

async function generateWave(client: Anthropic, s: StoryCandidate): Promise<WaveItem | null> {
  try {
    const raw = await callClaude(client, HAIKU, loadPrompt('wave') + storyContext(s));
    return waveItemSchema.parse(raw) as WaveItem;
  } catch (e) {
    console.warn(`  [skip wave] ${s.headline.slice(0, 60)}: ${(e as Error).message.slice(0, 80)}`);
    return null;
  }
}

async function runBatch<T>(
  label: string,
  items: unknown[],
  fn: (item: never) => Promise<T | null>
): Promise<T[]> {
  process.stdout.write(`Generating ${items.length} ${label}... `);
  const results: T[] = [];
  for (const item of items) {
    const result = await fn(item as never);
    if (result) results.push(result);
    process.stdout.write('.');
  }
  console.log(` ${results.length} ok`);
  return results;
}

function logCosts() {
  // Pricing as of 2025: Sonnet $3/$15 per MTok, Haiku $0.25/$1.25 per MTok
  const sonnetCost = (usage.sonnetIn * 3 + usage.sonnetOut * 15) / 1_000_000;
  const haikuCost = (usage.haikuIn * 0.25 + usage.haikuOut * 1.25) / 1_000_000;
  const total = sonnetCost + haikuCost;
  console.log(`\nTokens: Sonnet ${usage.sonnetIn}in/${usage.sonnetOut}out, Haiku ${usage.haikuIn}in/${usage.haikuOut}out`);
  console.log(`Estimated cost: ~$${total.toFixed(3)} (Sonnet $${sonnetCost.toFixed(3)} + Haiku $${haikuCost.toFixed(3)})`);
}

async function main() {
  const apiKey = requireEnv('ANTHROPIC_API_KEY');
  const client = new Anthropic({ apiKey });

  const filePath = latestFile(dataPath('selected'), 'Run pipeline:select first.');
  console.log(`Generating from ${path.basename(filePath)}\n`);
  const { lede: ledeStories, spread: spreadStories, sofClusters } = readJson<SelectedFile>(filePath);

  const ledeItems = await runBatch('Lede', ledeStories, (s) => generateLede(client, s));
  const spreadItems = await runBatch('Spread', spreadStories, (s) => generateSpread(client, s));
  const sofItems = await runBatch('SoF', sofClusters, (c) => generateSof(client, c));

  const quipSource = ledeStories;
  const waveSource = ledeStories;
  const quipItems = await runBatch('Quip', quipSource, (s) => generateQuip(client, s));
  const waveItems = await runBatch('Wave', waveSource, (s) => generateWave(client, s));

  const banks = { lede: ledeItems, spread: spreadItems, sof: sofItems, quip: quipItems, wave: waveItems };
  contentBanksSchema.parse(banks);

  const outPath = dataPath('generated', `${today()}.json`);
  writeJson(outPath, banks);

  console.log(`\n✓ Generated banks → ${outPath}`);
  console.log(`  lede: ${ledeItems.length}  spread: ${spreadItems.length}  sof: ${sofItems.length}  quip: ${quipItems.length}  wave: ${waveItems.length}`);

  if (ledeItems.length < 10) console.warn(`  WARNING: only ${ledeItems.length} Lede items`);
  if (spreadItems.length < 10) console.warn(`  WARNING: only ${spreadItems.length} Spread items`);
  if (sofItems.length < 10) console.warn(`  WARNING: only ${sofItems.length} SoF items (~${Math.floor(sofItems.length / 2)} sessions)`);

  logCosts();
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
