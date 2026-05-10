import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

export function calculatePoints(correct: boolean, currentStreak: number, baseAmount = 10): number {
  if (!correct) return 0;
  return baseAmount + Math.min(currentStreak * 2, 20);
}

export function getIssueNumber(): number {
  return Math.floor((Date.now() - new Date('2026-01-01').getTime()) / 86400000) + 1;
}

export function getTodayString(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getTodayISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  return `${Math.floor(diffDays / 7)} weeks ago`;
}

export function shuffleIndices(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface ChallengePayload {
  gameId: string;
  questionIndex: number;
  senderPrediction: string;
  senderAnswer: string;
  senderName: string;
  issuedAt: string;
}

export function genChallengeUrl(payload: ChallengePayload): string {
  const json = JSON.stringify(payload);
  const encoded = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `https://noodlebowl.app/c/${encoded}`;
}

export function decodeChallengeToken(token: string): ChallengePayload | null {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (padded.length % 4)) % 4;
    const json = atob(padded + '='.repeat(padding));
    return JSON.parse(json) as ChallengePayload;
  } catch {
    return null;
  }
}

export function pickFromBank<T>(bank: T[], seen: number[]): { idx: number; item: T; newSeen: number[] } {
  const effective = seen.length >= bank.length ? [] : seen;
  const available = bank.map((_, i) => i).filter(i => !effective.includes(i));
  const idx = available[Math.floor(Math.random() * available.length)];
  return { idx, item: bank[idx], newSeen: [...effective, idx] };
}

// Combines source + date into "Source Name, Month Year" format.
// Strips legacy year suffix from Claude-generated sourceHints ("ABC News, 2025" → "ABC News").
// Strips day from full dates ("May 21, 2025" → "May 2025").
export function formatAttribution(sourceHint?: string, eventDate?: string): string | undefined {
  const source = sourceHint?.replace(/,\s*\d{4}$/, '').trim();
  const monthYear = eventDate?.replace(/\s+\d+,/, '');
  if (source && monthYear) return `${source}, ${monthYear}`;
  return source ?? monthYear;
}

export function scoreSpread(guess: number, answer: number): { correct: boolean; points: number; deviation: number } {
  const deviation = Math.abs((guess - answer) / answer) * 100;
  let points = 0;
  if (deviation <= 5) points = 25;
  else if (deviation <= 15) points = 15;
  else if (deviation <= 30) points = 8;
  const correct = deviation <= 30;
  return { correct, points, deviation };
}

// Copies text to clipboard. Falls back to Share.share on Android emulator where
// the system clipboard is unavailable. Returns true if clipboard succeeded.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    await Share.share({ message: text });
    return false;
  }
}
