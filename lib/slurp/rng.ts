export interface Rng {
  next(): number;
  nextInt(max: number): number;
  shuffle<T>(arr: readonly T[]): T[];
  getState(): number;
}

export function createRng(initialState: number): Rng {
  let state = initialState;

  function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let z = Math.imul(state ^ (state >>> 15), 1 | state);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(max: number): number {
    return Math.floor(next() * max);
  }

  function shuffle<T>(arr: readonly T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function getState(): number {
    return state;
  }

  return { next, nextInt, shuffle, getState };
}
