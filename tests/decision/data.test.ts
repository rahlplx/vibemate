import { describe, it, expect } from 'bun:test';
import databases from '../../src/decision/data/databases.json';
import runtimes from '../../src/decision/data/runtimes.json';
import frameworks from '../../src/decision/data/frameworks.json';
import hosting from '../../src/decision/data/hosting.json';

describe('Benchmark Data', () => {
  describe('databases', () => {
    it('has at least 3 options', () => {
      expect(databases.length).toBeGreaterThanOrEqual(3);
    });

    it('each option has required fields', () => {
      for (const db of databases) {
        expect(db.id).toBeTruthy();
        expect(db.name).toBeTruthy();
        expect(db.scores).toBeDefined();
        expect(db.scores.performance).toBeGreaterThan(0);
      }
    });
  });

  describe('runtimes', () => {
    it('has at least 3 options', () => {
      expect(runtimes.length).toBeGreaterThanOrEqual(3);
    });

    it('each option has scores', () => {
      for (const rt of runtimes) {
        expect(rt.id).toBeTruthy();
        expect(rt.scores).toBeDefined();
      }
    });
  });

  describe('frameworks', () => {
    it('has at least 4 options', () => {
      expect(frameworks.length).toBeGreaterThanOrEqual(4);
    });

    it('each option has scores', () => {
      for (const fw of frameworks) {
        expect(fw.id).toBeTruthy();
        expect(fw.scores).toBeDefined();
      }
    });
  });

  describe('hosting', () => {
    it('has at least 3 options', () => {
      expect(hosting.length).toBeGreaterThanOrEqual(3);
    });

    it('each option has scores', () => {
      for (const h of hosting) {
        expect(h.id).toBeTruthy();
        expect(h.scores).toBeDefined();
      }
    });
  });
});
