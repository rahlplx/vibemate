import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { HarnessCompiler } from '../../src/compiler/index.js';
import type { OKFBundle } from '../../src/types.js';
import { mkdir, rm, readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const testBundle: OKFBundle = {
  root: '',
  version: '0.1',
  concepts: [
    {
      frontmatter: {
        type: 'architecture-decision',
        title: 'Use TDD',
        description: 'Write tests first',
        tags: ['testing'],
      },
      body: 'TDD is important for quality.',
    },
  ],
};

describe('HarnessCompiler', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `compiler-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('claude-code', () => {
    it('compiles CLAUDE.md and plugin.json', async () => {
      const compiler = new HarnessCompiler(testDir, 'claude-code');
      const result = await compiler.compile(testBundle, ['tdd', 'security']);

      expect(result.agent).toBe('claude-code');
      expect(result.skills).toHaveLength(2);
      expect(result.config).toBe('.claude-plugin/plugin.json');
      expect(result.context).toBe('CLAUDE.md');

      const claudeMd = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeMd).toContain('Vibemate');
      expect(claudeMd).toContain('Use TDD');

      const pluginJson = JSON.parse(await readFile(join(testDir, '.claude-plugin', 'plugin.json'), 'utf-8'));
      expect(pluginJson.name).toBe('vibemate');
      expect(pluginJson.skills).toHaveLength(2);
    });
  });

  describe('opencode', () => {
    it('compiles opencode.json and skills', async () => {
      const compiler = new HarnessCompiler(testDir, 'opencode');
      const result = await compiler.compile(testBundle, ['tdd']);

      expect(result.agent).toBe('opencode');
      expect(result.config).toBe('opencode.json');

      const opencodeJson = JSON.parse(await readFile(join(testDir, 'opencode.json'), 'utf-8'));
      expect(opencodeJson.name).toBe('vibemate');
      expect(opencodeJson.skills).toHaveLength(1);
    });
  });

  describe('cursor', () => {
    it('compiles .cursorrules and .mdc files', async () => {
      const compiler = new HarnessCompiler(testDir, 'cursor');
      const result = await compiler.compile(testBundle, ['tdd', 'security']);

      expect(result.agent).toBe('cursor');
      expect(result.config).toBe('.cursorrules');

      const cursorRules = await readFile(join(testDir, '.cursorrules'), 'utf-8');
      expect(cursorRules).toContain('Vibemate');
      expect(cursorRules).toContain('Use TDD');

      const ruleFiles = await readdir(join(testDir, '.cursor', 'rules'));
      expect(ruleFiles).toHaveLength(2);
      expect(ruleFiles.every(f => f.endsWith('.mdc'))).toBe(true);
    });
  });

  describe('codex', () => {
    it('compiles AGENTS.md and skills', async () => {
      const compiler = new HarnessCompiler(testDir, 'codex');
      const result = await compiler.compile(testBundle, ['tdd']);

      expect(result.agent).toBe('codex');
      expect(result.config).toBe('AGENTS.md');

      const agentsMd = await readFile(join(testDir, 'AGENTS.md'), 'utf-8');
      expect(agentsMd).toContain('Vibemate');
      expect(agentsMd).toContain('Use TDD');
    });
  });

  describe('unknown', () => {
    it('throws for unsupported agent type', async () => {
      const compiler = new HarnessCompiler(testDir, 'unknown' as never);
      await expect(compiler.compile(testBundle, ['tdd'])).rejects.toThrow('Unsupported agent type');
    });
  });

  describe('verify', () => {
    it('returns valid for compiled claude-code', async () => {
      const compiler = new HarnessCompiler(testDir, 'claude-code');
      await compiler.compile(testBundle, ['tdd']);

      const result = await compiler.verify();
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('returns missing files for uncompiled project', async () => {
      const compiler = new HarnessCompiler(testDir, 'claude-code');
      const result = await compiler.verify();
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });
});
