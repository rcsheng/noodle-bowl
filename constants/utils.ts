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

export function genChallengeUrl(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return `https://noodlebowl.app/c/${result}`;
}

export function pickFromBank<T>(bank: T[], seen: number[]): { idx: number; item: T; newSeen: number[] } {
  const effective = seen.length >= bank.length ? [] : seen;
  const available = bank.map((_, i) => i).filter(i => !effective.includes(i));
  const idx = available[Math.floor(Math.random() * available.length)];
  return { idx, item: bank[idx], newSeen: [...effective, idx] };
}
