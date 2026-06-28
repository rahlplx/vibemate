import { describe, it, expect } from 'bun:test';
import { resolveLSPConfig } from '../../src/cli/lsp.js';

describe('LSP Config Resolution', () => {
  it('TypeScript stack returns typescript-language-server and eslint-language-server', () => {
    const configs = resolveLSPConfig({ language: 'typescript' });
    const names = configs.map(c => c.name);
    expect(names).toContain('typescript-language-server');
    expect(names).toContain('eslint-language-server');
    expect(configs.length).toBe(2);
  });

  it('JavaScript stack returns typescript-language-server only', () => {
    const configs = resolveLSPConfig({ language: 'javascript' });
    const names = configs.map(c => c.name);
    expect(names).toContain('typescript-language-server');
    expect(configs.length).toBe(1);
  });

  it('Python stack returns pylsp', () => {
    const configs = resolveLSPConfig({ language: 'python' });
    const names = configs.map(c => c.name);
    expect(names).toContain('pylsp');
    expect(configs.length).toBe(1);
  });

  it('PHP stack returns intelephense', () => {
    const configs = resolveLSPConfig({ language: 'php' });
    const names = configs.map(c => c.name);
    expect(names).toContain('intelephense');
    expect(configs.length).toBe(1);
  });

  it('each LSPConfig has required fields: name, command, args, language', () => {
    const configs = resolveLSPConfig({ language: 'typescript' });
    for (const config of configs) {
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('command');
      expect(config).toHaveProperty('args');
      expect(config).toHaveProperty('language');
      expect(Array.isArray(config.args)).toBe(true);
    }
  });

  it('all LSP entries include installCmd hint', () => {
    const configs = resolveLSPConfig({ language: 'typescript' });
    for (const config of configs) {
      expect(config.installCmd).toBeDefined();
      expect(typeof config.installCmd).toBe('string');
    }
  });
});
