import { describe, expect, it } from 'vitest';
import { calculateScore } from './scoring.js';

describe('calculateScore', () => {
  it('returns a number within [0, 33]', () => {
    const s = calculateScore(0.8, 1500, '小学高年级组', 'attention');
    expect(typeof s).toBe('number');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(33);
  });

  it('caps score at 33', () => {
    const s = calculateScore(1, 200, '幼儿组', 'simultaneous');
    expect(s).toBeLessThanOrEqual(33);
  });
});

