import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveLSPConfig } from '../../src/cli/lsp.js';

const TMP = join(tmpdir(), 'lsp-install-test');

describe('resolveLSPConfig', () => {
  it('returns typescript-language-server and eslint for typescript stack', () => {
    const configs = resolveLSPConfig({ language: 'typescript' });
    expect(configs.length).toBeGreaterThanOrEqual(1);
    const names = configs.map(c => c.name);
    expect(names).toContain('typescript-language-server');
    expect(names).toContain('eslint-language-server');
  });

  it('returns only typescript-language-server for javascript stack', () => {
    const configs = resolveLSPConfig({ language: 'javascript' });
    expect(configs.length).toBe(1);
    expect(configs[0].name).toBe('typescript-language-server');
  });

  it('returns pylsp for python stack', () => {
    const configs = resolveLSPConfig({ language: 'python' });
    expect(configs.length).toBe(1);
    expect(configs[0].name).toBe('pylsp');
  });

  it('returns intelephense for php stack', () => {
    const configs = resolveLSPConfig({ language: 'php' });
    expect(configs.length).toBe(1);
    expect(configs[0].name).toBe('intelephense');
  });

  it('returns empty array for unknown language', () => {
    const configs = resolveLSPConfig({ language: 'ruby' as 'typescript' });
    expect(configs).toEqual([]);
  });

  it('all entries have required fields', () => {
    const configs = resolveLSPConfig({ language: 'typescript' });
    for (const c of configs) {
      expect(typeof c.name).toBe('string');
      expect(typeof c.command).toBe('string');
      expect(Array.isArray(c.args)).toBe(true);
      expect(typeof c.language).toBe('string');
      expect(typeof c.installCmd).toBe('string');
    }
  });

  it('installCmd contains npm install for typescript LSPs', () => {
    const configs = resolveLSPConfig({ language: 'typescript' });
    for (const c of configs) {
      expect(c.installCmd).toContain('npm install');
    }
  });
});

describe('LSP JSON write (.vibemate/lsp.json)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(TMP, String(Date.now()));
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('writes lsp.json to .vibemate/ when called with typescript stack', async () => {
    const { writeLSPConfig } = await import('../../src/cli/lsp-write.js');
    await writeLSPConfig(tmpDir, { language: 'typescript' });
    const lspFile = join(tmpDir, '.vibemate', 'lsp.json');
    expect(existsSync(lspFile)).toBe(true);
    const parsed = JSON.parse(readFileSync(lspFile, 'utf-8'));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThanOrEqual(2);
    expect(parsed.some((c: { name: string }) => c.name === 'typescript-language-server')).toBe(true);
  });

  it('overwrites existing lsp.json when stack changes', async () => {
    const { writeLSPConfig } = await import('../../src/cli/lsp-write.js');
    await writeLSPConfig(tmpDir, { language: 'python' });
    await writeLSPConfig(tmpDir, { language: 'typescript' });
    const lspFile = join(tmpDir, '.vibemate', 'lsp.json');
    const parsed = JSON.parse(readFileSync(lspFile, 'utf-8'));
    expect(parsed.some((c: { name: string }) => c.name === 'pylsp')).toBe(false);
    expect(parsed.some((c: { name: string }) => c.name === 'typescript-language-server')).toBe(true);
  });
});

describe('LSP plugin manifest merge', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(TMP, String(Date.now()));
    mkdirSync(join(tmpDir, '.claude-plugin'), { recursive: true });
    mkdirSync(join(tmpDir, '.vibemate'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('merges LSP entries into .claude-plugin/plugin.json', async () => {
    const { writeLSPConfig, mergeLSPIntoManifests } = await import('../../src/cli/lsp-write.js');
    const pluginPath = join(tmpDir, '.claude-plugin', 'plugin.json');
    const { writeFileSync } = await import('fs');
    writeFileSync(pluginPath, JSON.stringify({ name: 'vibemate', version: '1.0.0' }));

    const lspConfigs = resolveLSPConfig({ language: 'typescript' });
    await writeLSPConfig(tmpDir, { language: 'typescript' });
    await mergeLSPIntoManifests(tmpDir, lspConfigs);

    const manifest = JSON.parse(readFileSync(pluginPath, 'utf-8'));
    expect(manifest.lsp).toBeDefined();
    expect(Array.isArray(manifest.lsp)).toBe(true);
    expect(manifest.lsp.some((l: { name: string }) => l.name === 'typescript-language-server')).toBe(true);
  });

  it('merges LSP entries into opencode.json when present', async () => {
    const { writeLSPConfig, mergeLSPIntoManifests } = await import('../../src/cli/lsp-write.js');
    const ocPath = join(tmpDir, 'opencode.json');
    const { writeFileSync } = await import('fs');
    writeFileSync(ocPath, JSON.stringify({ name: 'vibemate', mcp: {} }));

    const lspConfigs = resolveLSPConfig({ language: 'typescript' });
    await writeLSPConfig(tmpDir, { language: 'typescript' });
    await mergeLSPIntoManifests(tmpDir, lspConfigs);

    const manifest = JSON.parse(readFileSync(ocPath, 'utf-8'));
    expect(manifest.lsp).toBeDefined();
    expect(manifest.lsp.some((l: { name: string }) => l.name === 'typescript-language-server')).toBe(true);
  });

  it('does not fail when no manifests exist', async () => {
    const { writeLSPConfig, mergeLSPIntoManifests } = await import('../../src/cli/lsp-write.js');
    const lspConfigs = resolveLSPConfig({ language: 'typescript' });
    await writeLSPConfig(tmpDir, { language: 'typescript' });
    let threw = false;
    try {
      await mergeLSPIntoManifests(tmpDir, lspConfigs);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});
