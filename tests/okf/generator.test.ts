// TDD Tests for OKF Generator
import { describe, it, expect, afterEach , beforeEach} from 'bun:test';
import { OKFGenerator } from '../../src/okf/generator.js';
import { mkdir, rm, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('OKFGenerator', () => {
  let testDir: string;
  let generator: OKFGenerator;

  beforeEach(async () => {
    testDir = join(tmpdir(), `okf-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    generator = new OKFGenerator(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('generate', () => {
    it('should create OKF bundle directory structure', async () => {
      const bundle = await generator.generate('test-project');

      expect(bundle).toBeDefined();
      expect(bundle.version).toBe('0.1');
      // Check that root contains the bundle path (Windows uses backslashes)
      expect(bundle.root).toMatch(/\.agents[/\\]okf-bundle/);

      // Check directories exist
      const archDir = join(testDir, '.agents', 'okf-bundle', 'architecture');
      const learnDir = join(testDir, '.agents', 'okf-bundle', 'learnings');
      const refDir = join(testDir, '.agents', 'okf-bundle', 'references');

      expect(await readdir(archDir)).toBeDefined();
      expect(await readdir(learnDir)).toBeDefined();
      expect(await readdir(refDir)).toBeDefined();
    });

    it('should create index.md with project name', async () => {
      await generator.generate('my-awesome-project');

      const indexPath = join(testDir, '.agents', 'okf-bundle', 'index.md');
      const content = await readFile(indexPath, 'utf-8');

      expect(content).toContain('my-awesome-project');
      expect(content).toContain('okf_version: "0.1"');
    });

    it('should create log.md with timestamp', async () => {
      await generator.generate('test-project');

      const logPath = join(testDir, '.agents', 'okf-bundle', 'log.md');
      const content = await readFile(logPath, 'utf-8');

      expect(content).toContain('Update History');
      expect(content).toContain(new Date().toISOString().split('T')[0]);
    });

    it('should create 6 pre-populated architectural decisions', async () => {
      const bundle = await generator.generate('test-project');

      expect(bundle.concepts.length).toBe(6);

      // Check each decision exists
      const archDir = join(testDir, '.agents', 'okf-bundle', 'architecture');
      const files = await readdir(archDir);
      
      expect(files).toContain('auth-strategy.md');
      expect(files).toContain('database-choice.md');
      expect(files).toContain('api-design.md');
      expect(files).toContain('testing-strategy.md');
      expect(files).toContain('security.md');
      expect(files).toContain('performance.md');
    });

    it('should include YAML frontmatter with required type field', async () => {
      await generator.generate('test-project');

      const authPath = join(testDir, '.agents', 'okf-bundle', 'architecture', 'auth-strategy.md');
      const content = await readFile(authPath, 'utf-8');

      expect(content).toMatch(/^---\n/);
      expect(content).toContain('type: architecture-decision');
      expect(content).toContain('title: "Authentication Strategy"');
    });

    it('should include recommended metrics in decisions', async () => {
      await generator.generate('test-project');

      const authPath = join(testDir, '.agents', 'okf-bundle', 'architecture', 'auth-strategy.md');
      const content = await readFile(authPath, 'utf-8');

      // Check that metrics are present (they may be formatted as JSON)
      expect(content).toContain('tokenLifetime');
      expect(content).toContain('15 minutes');
      // Algorithm is in the JSON-formatted metrics section
      expect(content).toContain('RS256');
    });
  });

  describe('query', () => {
    it('should query concepts by type', async () => {
      const bundle = await generator.generate('test-project');
      
      const archDecisions = await generator.query(bundle, 'architecture-decision');
      
      expect(archDecisions.length).toBe(6);
      expect(archDecisions.every(c => c.frontmatter.type === 'architecture-decision')).toBe(true);
    });

    it('should query concepts by tags', async () => {
      const bundle = await generator.generate('test-project');
      
      const securityDocs = await generator.query(bundle, undefined, ['security']);
      
      expect(securityDocs.length).toBeGreaterThan(0);
      expect(securityDocs.some(c => c.frontmatter.tags?.includes('security'))).toBe(true);
    });

    it('should query with both type and tags', async () => {
      const bundle = await generator.generate('test-project');
      
      const results = await generator.query(bundle, 'architecture-decision', ['database']);
      
      expect(results.length).toBe(1);
      expect(results[0].frontmatter.title).toContain('Database');
    });
  });

  describe('addLearning', () => {
    it('should add a new learning to the bundle', async () => {
      const bundle = await generator.generate('test-project');
      
      const learning = await generator.addLearning(bundle, {
        title: 'Test Learning',
        description: 'A test learning',
        lesson: 'Always write tests first',
        type: 'success',
        tags: ['testing', 'tdd']
      });

      expect(learning).toBeDefined();
      expect(learning.frontmatter.type).toBe('retro-learning');
      expect(learning.frontmatter.title).toBe('Test Learning');
      expect(bundle.concepts.length).toBe(7); // 6 original + 1 new
    });

    it('should write learning to learnings directory', async () => {
      const bundle = await generator.generate('test-project');
      
      await generator.addLearning(bundle, {
        title: 'My Learning',
        description: 'Important lesson',
        lesson: 'Lesson content',
        type: 'failure',
        tags: ['bug']
      });

      const learnDir = join(testDir, '.agents', 'okf-bundle', 'learnings');
      const files = await readdir(learnDir);
      
      expect(files.some(f => f.includes('retro-my-learning'))).toBe(true);
    });
  });

  describe('formatFrontmatter', () => {
    it('should format all standard fields', async () => {
      const bundle = await generator.generate('test-project');
      
      const authPath = join(testDir, '.agents', 'okf-bundle', 'architecture', 'auth-strategy.md');
      const content = await readFile(authPath, 'utf-8');
      
      // Check all standard fields are present
      expect(content).toContain('type:');
      expect(content).toContain('title:');
      expect(content).toContain('description:');
      expect(content).toContain('tags:');
      expect(content).toContain('timestamp:');
    });
  });
});
