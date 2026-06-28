import { describe, it, expect } from 'bun:test';
import { PLATFORMS, readConfig, writeConfig, addServerToConfig } from '../../src/mcp/installer.js';
import type { Platform } from '../../src/mcp/installer.js';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'vibemate-agent-install-'));
}

describe('Agent Install — Antigravity + OpenHands', () => {
  it('PLATFORMS includes antigravity entry with mcpServers key', () => {
    expect(PLATFORMS).toHaveProperty('antigravity');
    expect(PLATFORMS.antigravity.mcpKey).toBe('mcpServers');
    expect(PLATFORMS.antigravity.name).toBe('Antigravity');
    expect(PLATFORMS.antigravity.configPath).toContain('antigravity');
  });

  it('PLATFORMS includes openhands entry with config.toml path', () => {
    expect(PLATFORMS).toHaveProperty('openhands');
    expect(PLATFORMS.openhands.configPath).toContain('.toml');
    expect(PLATFORMS.openhands.name).toBe('OpenHands');
  });

  it('addServerToConfig correctly adds vibemate entry for antigravity', () => {
    const config: Record<string, unknown> = {};
    const entry = { command: 'npx', args: ['-y', 'vibemate-mcp'] };
    const updated = addServerToConfig(config, 'antigravity', entry);
    expect(updated).toHaveProperty('mcpServers');
    expect((updated.mcpServers as Record<string, unknown>)).toHaveProperty('vibemate');
  });

  it('addServerToConfig correctly adds vibemate entry for openhands', () => {
    const config: Record<string, unknown> = {};
    const entry = { command: 'npx', args: ['-y', 'vibemate-mcp'] };
    const updated = addServerToConfig(config, 'openhands', entry);
    expect(updated).toHaveProperty('mcpServers');
    expect((updated.mcpServers as Record<string, unknown>)).toHaveProperty('vibemate');
  });

  it('writeConfig for openhands writes TOML format', async () => {
    const tmpDir = await makeTempDir();
    const openhandsDir = join(tmpDir, '.openhands');
    await mkdir(openhandsDir, { recursive: true });

    // Override configPath for test isolation
    const originalPath = PLATFORMS.openhands.configPath;
    (PLATFORMS.openhands as { configPath: string }).configPath = join(openhandsDir, 'config.toml');

    try {
      const data = { mcpServers: { vibemate: { command: 'npx', args: ['-y', 'vibemate-mcp'] } } };
      await writeConfig('openhands', data);

      const { readFile } = await import('fs/promises');
      const content = await readFile(PLATFORMS.openhands.configPath, 'utf-8');
      // TOML output should not contain JSON braces at the top level
      expect(content).toContain('[mcpServers]');
    } finally {
      (PLATFORMS.openhands as { configPath: string }).configPath = originalPath;
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('readConfig for openhands parses TOML', async () => {
    const tmpDir = await makeTempDir();
    const openhandsDir = join(tmpDir, '.openhands');
    await mkdir(openhandsDir, { recursive: true });
    const tomlPath = join(openhandsDir, 'config.toml');
    await writeFile(tomlPath, '[mcpServers]\nvibemate = "test"\n', 'utf-8');

    const originalPath = PLATFORMS.openhands.configPath;
    (PLATFORMS.openhands as { configPath: string }).configPath = tomlPath;

    try {
      const config = await readConfig('openhands');
      expect(config).toHaveProperty('mcpServers');
    } finally {
      (PLATFORMS.openhands as { configPath: string }).configPath = originalPath;
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
