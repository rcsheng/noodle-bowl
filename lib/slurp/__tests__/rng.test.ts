import { createRng } from '../rng';

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 20; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() returns values in [0, 1)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt(max) returns integers in [0, max)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextInt(6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
  });

  it('shuffle returns all original elements', () => {
    const rng = createRng(123);
    const original = [1, 2, 3, 4, 5, 6];
    const shuffled = rng.shuffle(original);
    expect(shuffled).toHaveLength(original.length);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(original);
  });

  it('shuffle does not mutate the input array', () => {
    const rng = createRng(55);
    const original = [10, 20, 30];
    const copy = [...original];
    rng.shuffle(original);
    expect(original).toEqual(copy);
  });

  it('getState() is unchanged when next() was never called', () => {
    const rng = createRng(500);
    const stateBefore = rng.getState();
    expect(rng.getState()).toBe(stateBefore);
  });

  it('getState() advances after calling next()', () => {
    const rng = createRng(500);
    const stateBefore = rng.getState();
    rng.next();
    expect(rng.getState()).not.toBe(stateBefore);
  });

  it('can resume from saved state', () => {
    const rng1 = createRng(42);
    rng1.next(); // advance once
    const savedState = rng1.getState();
    const remaining1 = Array.from({ length: 5 }, () => rng1.next());

    const rng2 = createRng(savedState);
    const remaining2 = Array.from({ length: 5 }, () => rng2.next());

    expect(remaining1).toEqual(remaining2);
  });

  it('produces a non-uniform distribution across many calls', () => {
    const rng = createRng(1);
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 1000; i++) {
      counts[rng.nextInt(10)]++;
    }
    // Each bucket should be roughly 100 ± 50
    for (const count of counts) {
      expect(count).toBeGreaterThan(50);
      expect(count).toBeLessThan(200);
    }
  });
});
