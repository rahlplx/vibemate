import { describe, it, expect, afterEach , beforeEach} from 'bun:test';
import {
  writeFile,
  writeFiles,
  fileExists,
  readFile,
} from '../../src/scaffold/file-writer.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.join(process.cwd(), '.test-file-writer');

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('FileWriter', () => {
  describe('writeFile', () => {
    it('creates a file', () => {
      writeFile(TEST_DIR, 'hello.txt', 'Hello World');
      expect(fileExists(TEST_DIR, 'hello.txt')).toBe(true);
    });

    it('writes content', () => {
      writeFile(TEST_DIR, 'hello.txt', 'Hello World');
      const content = readFile(TEST_DIR, 'hello.txt');
      expect(content).toBe('Hello World');
    });

    it('creates nested directories', () => {
      writeFile(TEST_DIR, 'src/utils/helper.ts', 'export const helper = () => {};');
      expect(fileExists(TEST_DIR, 'src/utils/helper.ts')).toBe(true);
    });

    it('overwrites existing files', () => {
      writeFile(TEST_DIR, 'test.txt', 'original');
      writeFile(TEST_DIR, 'test.txt', 'updated');
      expect(readFile(TEST_DIR, 'test.txt')).toBe('updated');
    });
  });

  describe('writeFiles', () => {
    it('writes multiple files', () => {
      writeFiles(TEST_DIR, [
        { path: 'a.txt', content: 'A' },
        { path: 'b.txt', content: 'B' },
      ]);
      expect(fileExists(TEST_DIR, 'a.txt')).toBe(true);
      expect(fileExists(TEST_DIR, 'b.txt')).toBe(true);
    });
  });

  describe('readFile', () => {
    it('reads file content', () => {
      writeFile(TEST_DIR, 'readme.md', '# Hello');
      expect(readFile(TEST_DIR, 'readme.md')).toBe('# Hello');
    });

    it('returns null for non-existent file', () => {
      expect(readFile(TEST_DIR, 'nope.txt')).toBeNull();
    });
  });
});
