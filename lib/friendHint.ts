import type { GameId } from '@/constants/data';

export function isFriendHintMatch(
  gameId: GameId,
  optionIndex: number,
  friendHint: string | undefined,
): boolean {
  if (!friendHint) return false;
  switch (gameId) {
    case 'lede': {
      const parsed = parseInt(friendHint, 10);
      if (isNaN(parsed)) return false;
      return parsed === optionIndex;
    }
    case 'sof': {
      const parsed = parseInt(friendHint, 10);
      if (isNaN(parsed)) return false;
      return (parsed - 1) === optionIndex;
    }
    default:
      return false;
  }
}
