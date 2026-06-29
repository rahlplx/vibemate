import { describe, it, expect, afterEach, beforeEach } from 'bun:test';
import { mkdirSync, existsSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import {
  PLATFORMS,
  detectPlatform,
  getPlatformConfig,
  createVibemateEntry,
  addServerToConfig,
  readConfig,
  writeConfig,
  backupConfig,
  install,
  compilePlatform,
  type Platform,
} from '../../src/mcp/installer.js';

// Use platforms unlikely to have real configs in this environment
const CODEX_PATH = PLATFORMS.codex.configPath;
const OPENHANDS_PATH = PLATFORMS.openhands.configPath;

function ensureParent(p: string) {
  mkdirSync(dirname(p), { recursive: true });
}

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

  it('claude configPath points to settings.json not claude_desktop_config.json', () => {
    const p = PLATFORMS.claude;
    expect(p.configPath).toContain('settings.json');
    expect(p.configPath).not.toContain('claude_desktop_config.json');
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

  it('uses scoped package -p flag for correct npx invocation', () => {
    const entry = createVibemateEntry();
    expect(entry.args).toContain('-p');
    expect(entry.args).toContain('@vibemate/core');
    const pIdx = entry.args.indexOf('-p');
    expect(entry.args[pIdx + 1]).toBe('@vibemate/core');
  });

  it('preserves -y flag in npx args', () => {
    const entry = createVibemateEntry();
    expect(entry.args[0]).toBe('-y');
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

describe('detectPlatform (with file)', () => {
  afterEach(() => {
    if (existsSync(CODEX_PATH)) rmSync(CODEX_PATH);
  });

  it('returns platform name when config file exists', async () => {
    ensureParent(CODEX_PATH);
    writeFileSync(CODEX_PATH, '{}');
    const result = detectPlatform();
    // codex may not be first — but at minimum a string is returned
    expect(typeof result).toBe('string');
  });
});

describe('readConfig', () => {
  afterEach(() => {
    if (existsSync(CODEX_PATH)) rmSync(CODEX_PATH);
    if (existsSync(OPENHANDS_PATH)) rmSync(OPENHANDS_PATH);
  });

  it('returns empty object when file does not exist', async () => {
    const result = await readConfig('codex');
    expect(result).toEqual({});
  });

  it('reads JSON config when file exists', async () => {
    ensureParent(CODEX_PATH);
    writeFileSync(CODEX_PATH, JSON.stringify({ mcp: { existing: true } }));
    const result = await readConfig('codex');
    expect((result.mcp as Record<string, unknown>).existing).toBe(true);
  });

  it('reads TOML config for openhands via Bun.TOML', async () => {
    ensureParent(OPENHANDS_PATH);
    writeFileSync(OPENHANDS_PATH, '[mcpServers]\nname = "test"\n');
    const result = await readConfig('openhands');
    expect(result.mcpServers).toBeDefined();
    expect((result.mcpServers as Record<string, unknown>).name).toBe('test');
  });
});

describe('writeConfig', () => {
  afterEach(() => {
    if (existsSync(CODEX_PATH)) rmSync(CODEX_PATH);
    if (existsSync(dirname(CODEX_PATH)) && !existsSync(CODEX_PATH)) {
      // leave dir — it may have been created by the test
    }
    if (existsSync(OPENHANDS_PATH)) rmSync(OPENHANDS_PATH);
  });

  it('writes JSON config and directory is created if needed', async () => {
    // Remove codex dir if it exists to test mkdir branch
    const dir = dirname(CODEX_PATH);
    if (existsSync(dir)) rmSync(dir, { recursive: true });
    await writeConfig('codex', { mcp: { vibemate: { command: 'npx', args: [] } } });
    expect(existsSync(CODEX_PATH)).toBe(true);
    const parsed = JSON.parse(readFileSync(CODEX_PATH, 'utf-8'));
    expect(parsed.mcp.vibemate.command).toBe('npx');
  });

  it('writes TOML config for openhands with object sections', async () => {
    ensureParent(OPENHANDS_PATH);
    const data = {
      mcpServers: { vibemate: { command: 'npx', args: ['-y', 'vibemate-mcp'] } },
    };
    await writeConfig('openhands', data);
    const content = readFileSync(OPENHANDS_PATH, 'utf-8');
    expect(content).toContain('[mcpServers]');
    expect(content).toContain('vibemate');
  });

  it('writes TOML with scalar top-level values (boolean, null, array)', async () => {
    ensureParent(OPENHANDS_PATH);
    const data: Record<string, unknown> = {
      active: true,
      count: 0,
      nothing: null,
      tags: ['a', 'b'],
    };
    await writeConfig('openhands', data);
    const content = readFileSync(OPENHANDS_PATH, 'utf-8');
    expect(content).toContain('active = true');
    expect(content).toContain('nothing = ""');
    expect(content).toContain('tags = ["a", "b"]');
  });
});

describe('backupConfig', () => {
  afterEach(() => {
    // Best-effort cleanup of backup files
    const dir = dirname(CODEX_PATH);
    if (existsSync(dir)) {
      for (const f of ([] as string[])) {
        if (existsSync(f)) rmSync(f);
      }
    }
    if (existsSync(CODEX_PATH)) rmSync(CODEX_PATH);
  });

  it('returns null when config does not exist', async () => {
    const result = await backupConfig('codex');
    expect(result).toBeNull();
  });

  it('copies config and returns backup path when file exists', async () => {
    ensureParent(CODEX_PATH);
    writeFileSync(CODEX_PATH, '{"mcp":{}}');
    const backupPath = await backupConfig('codex');
    expect(backupPath).not.toBeNull();
    expect(backupPath).toContain('.backup.');
    expect(existsSync(backupPath!)).toBe(true);
    rmSync(backupPath!);
  });
});

describe('install', () => {
  afterEach(() => {
    if (existsSync(CODEX_PATH)) rmSync(CODEX_PATH);
  });

  it('throws when no platform detected and none specified', async () => {
    // Only run if none of the platform files exist (safe in test environment)
    const hasPlatform = Object.values(PLATFORMS).some(p => existsSync(p.configPath));
    if (!hasPlatform) {
      await expect(install()).rejects.toThrow('No supported AI coding tool detected');
    }
  });

  it('dry-run returns result without writing config', async () => {
    const result = await install({ platform: 'codex', dryRun: true });
    expect(result.platform).toBe('codex');
    expect(result.config).toBeDefined();
    expect(existsSync(CODEX_PATH)).toBe(false);
  });

  it('writes config when dryRun is false', async () => {
    await install({ platform: 'codex', dryRun: false });
    expect(existsSync(CODEX_PATH)).toBe(true);
    const parsed = JSON.parse(readFileSync(CODEX_PATH, 'utf-8'));
    expect((parsed.mcp as Record<string, unknown>).vibemate).toBeDefined();
  });

  it('includes backupPath in result (null when no prior config)', async () => {
    const result = await install({ platform: 'codex', dryRun: true });
    expect(result.backupPath).toBeNull();
  });

  it('includes apiKey env in vibemate entry', async () => {
    const result = await install({ platform: 'codex', apiKey: 'sk-test-key', dryRun: true });
    const servers = result.config.mcp as Record<string, Record<string, unknown>>;
    expect((servers.vibemate.env as Record<string, string>).ANTHROPIC_API_KEY).toBe('sk-test-key');
  });

  it('backs up existing config and returns backupPath', async () => {
    ensureParent(CODEX_PATH);
    writeFileSync(CODEX_PATH, '{"mcp":{}}');
    const result = await install({ platform: 'codex', dryRun: false });
    expect(result.backupPath).not.toBeNull();
    if (result.backupPath) rmSync(result.backupPath);
  });
});

describe('compilePlatform', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = join(tmpdir(), `vibemate-compile-${Date.now()}`);
    mkdirSync(tmpRoot, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('compiles claude-code artifacts into tmpRoot', async () => {
    await compilePlatform(tmpRoot, 'claude');
    expect(existsSync(join(tmpRoot, '.claude-plugin', 'plugin.json'))).toBe(true);
    const manifest = JSON.parse(readFileSync(join(tmpRoot, '.claude-plugin', 'plugin.json'), 'utf-8'));
    expect(manifest.name).toBeDefined();
    expect(manifest.mcpServers).toBeDefined();
    const entry = manifest.mcpServers.vibemate;
    expect(entry.args).toContain('-p');
    expect(entry.args).toContain('@vibemate/core');
  });

  it('compiles opencode artifacts into tmpRoot', async () => {
    await compilePlatform(tmpRoot, 'opencode');
    expect(existsSync(join(tmpRoot, 'opencode.json'))).toBe(true);
    const manifest = JSON.parse(readFileSync(join(tmpRoot, 'opencode.json'), 'utf-8'));
    expect(manifest.mcp).toBeDefined();
    const entry = manifest.mcp.vibemate;
    expect(entry.args).toContain('-p');
    expect(entry.args).toContain('@vibemate/core');
  });
});
