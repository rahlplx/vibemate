// TDD Tests for Context Pipeline
import { describe, it, expect, afterEach , beforeEach} from 'bun:test';
import { ContextPipeline } from '../../src/context/pipeline.js';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ContextPipeline', () => {
  let testDir: string;
  let pipeline: ContextPipeline;

  beforeEach(async () => {
    testDir = join(tmpdir(), `context-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    pipeline = new ContextPipeline(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('extractRelevant', () => {
    it('should extract imports and exports from file', async () => {
      const testFile = join(testDir, 'test.ts');
      await writeFile(testFile, `
import { foo } from './foo';
import { bar } from './bar';

const internal = 'not exported';

export function myFunction() {
  return 'hello';
}

export const myConst = 42;
      `);

      const result = await pipeline.extractRelevant(testFile);

      expect(result).toBeDefined();
      expect(result.relevantCode).toContain('import');
      expect(result.relevantCode).toContain('export');
      expect(result.tokenReduction).toBeGreaterThan(0);
    });

    it('should extract specific function when target provided', async () => {
      const testFile = join(testDir, 'test.ts');
      await writeFile(testFile, `
import { foo } from './foo';

function otherFunction() {
  return 'other';
}

function targetFunction() {
  return 'target';
}

function anotherFunction() {
  return 'another';
}
      `);

      const result = await pipeline.extractRelevant(testFile, 'targetFunction');

      expect(result.relevantCode).toContain('targetFunction');
      expect(result.relevantCode).toContain('import');
      expect(result.relevantCode).not.toContain('otherFunction');
    });
  });

  describe('compress', () => {
    it('should remove redundant whitespace', () => {
      const input = 'This   has   extra   spaces';
      const result = pipeline.compress(input);

      expect(result.compressed).toBe('This has extra spaces');
      expect(result.reductionPercent).toBeGreaterThan(0);
    });

    it('should remove single-line comments', () => {
      const input = `// This is a comment
const x = 42; // inline comment`;
      const result = pipeline.compress(input);

      expect(result.compressed).not.toContain('// This is a comment');
      expect(result.compressed).toContain('const x = 42;');
    });

    it('should compress common phrases', () => {
      const input = 'In order to test this, we need to run the tests';
      const result = pipeline.compress(input);

      expect(result.compressed).toContain('to test this');
      expect(result.compressed).not.toContain('In order to');
    });

    it('should preserve original content', () => {
      const input = 'Original content here';
      const result = pipeline.compress(input);

      expect(result.original).toBe(input);
    });
  });

  describe('sanitize', () => {
    it('should mask AWS keys', () => {
      const input = 'AWS Key: AKIAIOSFODNN7EXAMPLE';
      const result = pipeline.sanitize(input);

      expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(result).toContain('***MASKED_AWS_KEY***');
    });

    it('should mask GitHub tokens', () => {
      const input = 'Auth: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij';
      const result = pipeline.sanitize(input);

      expect(result).not.toContain('ghp_');
      expect(result).toContain('***MASKED_GITHUB_TOKEN***');
    });

    it('should mask JWT tokens', () => {
      const input = 'JWT: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const result = pipeline.sanitize(input);

      expect(result).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      expect(result).toContain('***MASKED_JWT***');
    });

    it('should mask email addresses', () => {
      const input = 'Contact: user@example.com';
      const result = pipeline.sanitize(input);

      expect(result).not.toContain('user@example.com');
      expect(result).toContain('***MASKED_EMAIL***');
    });

    it('should mask private IP addresses', () => {
      const input = 'Server: 192.168.1.100';
      const result = pipeline.sanitize(input);

      expect(result).not.toContain('192.168.1.100');
      expect(result).toContain('***MASKED_IP***');
    });

    it('should mask connection strings', () => {
      const input = 'DB: postgresql://user:pass@localhost/db';
      const result = pipeline.sanitize(input);

      expect(result).not.toContain('postgresql://');
      expect(result).toContain('***MASKED_CONNECTION_STRING***');
    });
  });

  describe('reinject', () => {
    it('should reinject masked values', () => {
      const original = 'AWS Key: AKIAIOSFODNN7EXAMPLE';
      const sanitized = 'AWS Key: ***MASKED_AWS_KEY***';
      const response = 'The ***MASKED_AWS_KEY*** is configured';

      const result = pipeline.reinject(original, sanitized, response);

      expect(result).toContain('AKIAIOSFODNN7EXAMPLE');
      expect(result).not.toContain('***MASKED_AWS_KEY***');
    });
  });

  describe('cacheContext', () => {
    it('should create cache entry for files', async () => {
      const testFile = join(testDir, 'test.txt');
      await writeFile(testFile, 'test content');

      const cacheKey = await pipeline.cacheContext(['test.txt']);

      expect(cacheKey).toBeDefined();
      expect(typeof cacheKey).toBe('string');
    });

    it('should return same key for same content', async () => {
      const testFile = join(testDir, 'test.txt');
      await writeFile(testFile, 'test content');

      const key1 = await pipeline.cacheContext(['test.txt']);
      const key2 = await pipeline.cacheContext(['test.txt']);

      expect(key1).toBe(key2);
    });
  });

  describe('getCachedContext', () => {
    it('should retrieve cached content', async () => {
      const testFile = join(testDir, 'test.txt');
      await writeFile(testFile, 'cached content');

      const cacheKey = await pipeline.cacheContext(['test.txt']);
      const content = await pipeline.getCachedContext(cacheKey);

      expect(content).toContain('cached content');
    });

    it('should return null for unknown key', async () => {
      const content = await pipeline.getCachedContext('nonexistent');

      expect(content).toBeNull();
    });
  });

  describe('process', () => {
    it('should run full pipeline', async () => {
      const testFile = join(testDir, 'test.ts');
      
      // Create a test file with imports and exports
      const testContent = `import { foo } from './foo';
// This is a comment
export function myFunction() {
  return 'hello world';
}
      `.trim();
      
      await writeFile(testFile, testContent);

      const result = await pipeline.process(testFile);

      expect(result.extracted).toBeDefined();
      expect(result.compressed).toBeDefined();
      expect(result.sanitized).toBeDefined();
      expect(result.cacheKey).toBeDefined();

      // Verify extraction picked up the import and export
      expect(result.extracted.relevantCode).toContain('import');
      expect(result.extracted.relevantCode).toContain('export');
      
      // Verify compression is defined (may or may not reduce depending on content)
      expect(result.compressed.compressed).toBeDefined();
      
      // Verify sanitization produced output
      expect(result.sanitized).toBeDefined();
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens (rough: 1 token ≈ 4 chars)', () => {
      const tokens = pipeline.estimateTokens('Hello World'); // 11 chars

      expect(tokens).toBe(3); // ceil(11/4) = 3
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = pipeline.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });
});
