import { createHash } from 'crypto';

export interface SeededRandom {
  next(): number;
  nextInt(min: number, max: number): number;
  pick<T>(array: T[]): T;
}

export function createSeededRandom(seed?: string): SeededRandom {
  let state = seed ? hashString(seed) : Date.now();

  function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function next(): number {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  }

  return {
    next,
    nextInt(min: number, max: number): number {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick<T>(array: T[]): T {
      return array[Math.floor(next() * array.length)];
    },
  };
}

export function generateDeterministicId(input: string): string {
  const hash = createHash('sha256').update(input).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    (parseInt(hash[16], 16) & 0x3 | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-');
}
