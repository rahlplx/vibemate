import { describe, it, expect } from 'bun:test';
import { createSeededRandom, generateDeterministicId } from '../../src/shared/random.js';

describe('createSeededRandom', () => {
  it('should create RNG with default seed', () => {
    const rng = createSeededRandom();
    expect(rng).toBeDefined();
    expect(rng.next).toBeDefined();
    expect(rng.nextInt).toBeDefined();
    expect(rng.pick).toBeDefined();
  });

  it('should create RNG with custom seed', () => {
    const rng = createSeededRandom('test-seed');
    expect(rng).toBeDefined();
  });

  it('should generate numbers between 0 and 1', () => {
    const rng = createSeededRandom();
    for (let i = 0; i < 100; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('should generate deterministic results with same seed', () => {
    const rng1 = createSeededRandom('same-seed');
    const rng2 = createSeededRandom('same-seed');
    
    for (let i = 0; i < 10; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('should generate different results with different seeds', () => {
    const rng1 = createSeededRandom('seed-1');
    const rng2 = createSeededRandom('seed-2');
    
    const values1 = Array.from({ length: 10 }, () => rng1.next());
    const values2 = Array.from({ length: 10 }, () => rng2.next());
    
    expect(values1).not.toEqual(values2);
  });

  it('should generate integers in range', () => {
    const rng = createSeededRandom();
    for (let i = 0; i < 100; i++) {
      const value = rng.nextInt(5, 15);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(15);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('should pick random items from array', () => {
    const rng = createSeededRandom();
    const array = ['a', 'b', 'c', 'd', 'e'];
    
    for (let i = 0; i < 100; i++) {
      const picked = rng.pick(array);
      expect(array).toContain(picked);
    }
  });

  it('should handle single-item array', () => {
    const rng = createSeededRandom();
    const array = ['only'];
    
    for (let i = 0; i < 10; i++) {
      const picked = rng.pick(array);
      expect(picked).toBe('only');
    }
  });

  it('should produce different sequences for different seeds', () => {
    const rng1 = createSeededRandom('alpha');
    const rng2 = createSeededRandom('beta');
    
    const first1 = rng1.next();
    const first2 = rng2.next();
    
    expect(first1).not.toBe(first2);
  });
});

describe('generateDeterministicId', () => {
  it('should generate a UUID', () => {
    const id = generateDeterministicId('test-input');
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate different IDs for different inputs', () => {
    const id1 = generateDeterministicId('input-1');
    const id2 = generateDeterministicId('input-2');
    expect(id1).not.toBe(id2);
  });
});
