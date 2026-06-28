import { describe, it, expect } from 'bun:test';
import {
  PLATFORMS,
  detectPlatform,
  getPlatformConfig,
  createVibemateEntry,
  addServerToConfig,
  type Platform,
} from '../../src/mcp/installer.js';

describe('PLATFORMS', () => {
  it('has 7 platforms', () => {
    expect(Object.keys(PLATFORMS)).toHaveLength(7);
  });

  it('claude has correct config', () => {
    const p = PLATFORMS.claude;
    expect(p.name).toBe('Claude Code');
    expect(p.mcpKey).toBe('mcpServers');
    expect(p.configPath).toContain('.claude');
  });

  it('cursor has correct config', () => {
    const p = PLATFORMS.cursor;
    expect(p.name).toBe('Cursor');
    expect(p.mcpKey).toBe('mcpServers');
    expect(p.configPath).toContain('.cursor');
  });

  it('codex has correct config', () => {
    const p = PLATFORMS.codex;
    expect(p.name).toBe('Codex');
    expect(p.mcpKey).toBe('mcp');
  });

  it('kilocode has correct config', () => {
    const p = PLATFORMS.kilocode;
    expect(p.name).toBe('Kilocode');
    expect(p.mcpKey).toBe('mcpServers');
  });

  it('opencode has correct config', () => {
    const p = PLATFORMS.opencode;
    expect(p.name).toBe('OpenCode');
    expect(p.mcpKey).toBe('mcp');
    expect(p.configPath).toContain('opencode');
  });
});

describe('detectPlatform', () => {
  it('returns a platform or null', () => {
    const result = detectPlatform();
    expect(result === null || typeof result === 'string').toBe(true);
  });
});

describe('getPlatformConfig', () => {
  it('returns config for each platform', () => {
    const platforms: Platform[] = ['claude', 'cursor', 'codex', 'kilocode', 'opencode'];
    for (const p of platforms) {
      const config = getPlatformConfig(p);
      expect(config).toBeDefined();
      expect(config.name.length).toBeGreaterThan(0);
      expect(config.configPath.length).toBeGreaterThan(0);
      expect(config.mcpKey.length).toBeGreaterThan(0);
    }
  });
});

describe('createVibemateEntry', () => {
  it('creates entry without API key', () => {
    const entry = createVibemateEntry();
    expect(entry.command).toBe('npx');
    expect(entry.args).toContain('vibemate-mcp');
    expect(entry.env).toBeUndefined();
  });

  it('creates entry with API key', () => {
    const entry = createVibemateEntry({ apiKey: 'test-key' });
    expect(entry.env).toBeDefined();
    expect(entry.env!.ANTHROPIC_API_KEY).toBe('test-key');
  });
});

describe('addServerToConfig', () => {
  it('adds vibemate to empty config', () => {
    const result = addServerToConfig({}, 'claude', createVibemateEntry());
    expect(result.mcpServers).toBeDefined();
    const servers = result.mcpServers as Record<string, unknown>;
    expect(servers.vibemate).toBeDefined();
  });

  it('adds vibemate to existing config', () => {
    const existing = {
      mcpServers: {
        other: { command: 'other', args: [] },
      },
    };
    const result = addServerToConfig(existing, 'claude', createVibemateEntry());
    const servers = result.mcpServers as Record<string, unknown>;
    expect(servers.other).toBeDefined();
    expect(servers.vibemate).toBeDefined();
  });

  it('uses correct key for codex', () => {
    const result = addServerToConfig({}, 'codex', createVibemateEntry());
    expect(result.mcp).toBeDefined();
  });

  it('uses correct key for opencode', () => {
    const result = addServerToConfig({}, 'opencode', createVibemateEntry());
    expect(result.mcp).toBeDefined();
  });

  it('preserves existing config fields', () => {
    const existing = {
      mcpServers: {},
      otherField: 'preserved',
    };
    const result = addServerToConfig(existing, 'claude', createVibemateEntry());
    expect(result.otherField).toBe('preserved');
  });
});
