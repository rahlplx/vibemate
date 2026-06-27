import { describe, it, expect, afterEach , beforeEach} from 'bun:test';
import {
  createScaffoldGenerator,
  type ScaffoldGenerator,
} from '../../src/scaffold/generator.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.join(process.cwd(), '.test-generator');

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('ScaffoldGenerator', () => {
  describe('generate', () => {
    it('creates project files', () => {
      const gen = createScaffoldGenerator();
      gen.generate(TEST_DIR, 'default', {
        projectName: 'test-app',
        description: 'A test app',
      });
      expect(fs.existsSync(path.join(TEST_DIR, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_DIR, 'src/index.ts'))).toBe(true);
    });

    it('renders template variables', () => {
      const gen = createScaffoldGenerator();
      gen.generate(TEST_DIR, 'default', {
        projectName: 'my-project',
        description: 'My project',
      });
      const pkg = JSON.parse(
        fs.readFileSync(path.join(TEST_DIR, 'package.json'), 'utf-8')
      );
      expect(pkg.name).toBe('my-project');
      expect(pkg.description).toBe('My project');
    });

    it('returns list of created files', () => {
      const gen = createScaffoldGenerator();
      const files = gen.generate(TEST_DIR, 'default', {
        projectName: 'test',
        description: 'Test',
      });
      expect(files.length).toBeGreaterThan(0);
      expect(files).toContain('package.json');
    });
  });

  describe('getAvailableTemplates', () => {
    it('returns template list', () => {
      const gen = createScaffoldGenerator();
      const templates = gen.getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });
  });
});
