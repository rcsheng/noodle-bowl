import { z } from 'zod';

export const ledePanelistSchema = z.object({
  name: z.string(),
  role: z.string(),
  completion: z.string().min(1),
  pitch: z.string(),
  isCorrect: z.boolean(),
});

export const ledeItemSchema = z.object({
  partialHeadline: z.string().min(10),
  sourceHint: z.string().min(1),
  panelists: z.array(ledePanelistSchema).length(3),
  explanation: z.string().min(20),
});

export const spreadItemSchema = z.object({
  question: z.string().min(10),
  answer: z.number(),
  unit: z.string().min(1),
  others: z.array(z.number()),
  explanation: z.string().min(20),
});

const sofClaimSchema = z.object({
  text: z.string().min(10),
  isScience: z.boolean(),
  explanation: z.string().min(10),
  source: z.object({ name: z.string(), url: z.string() }).nullable(),
});

export const sofItemSchema = z.object({
  topic: z.string().min(1),
  intro: z.string(),
  weirdAndTrue: z.boolean(),
  claims: z.array(sofClaimSchema).length(3),
});

export const quipPromptSchema = z.object({
  setup: z.string().min(10),
  sourceHint: z.string().min(1),
});

export const waveItemSchema = z.object({
  leftLabel: z.string().min(1),
  rightLabel: z.string().min(1),
  story: z.string().min(10),
  truthPosition: z.number().int().min(0).max(100),
  explanation: z.string().min(10),
});

export const contentBanksSchema = z.object({
  lede: z.array(ledeItemSchema),
  spread: z.array(spreadItemSchema),
  sof: z.array(sofItemSchema),
  quip: z.array(quipPromptSchema),
  wave: z.array(waveItemSchema),
});
