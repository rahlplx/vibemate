import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { 
  detectPlatform, 
  getPlatformConfig, 
  createVibemateEntry, 
  addServerToConfig,
  PLATFORMS,
  Platform
} from '../../src/mcp/installer.js';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Config Injector', () => {
  describe('detectPlatform', () => {
    it('returns a platform or null', () => {
      const result = detectPlatform();
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('getPlatformConfig', () => {
    it('returns config for each platform', () => {
      for (const platform of Object.keys(PLATFORMS)) {
        const config = getPlatformConfig(platform as Platform);
        expect(config).toBeDefined();
        expect(config.name).toBeDefined();
        expect(config.configPath).toBeDefined();
        expect(config.mcpKey).toBeDefined();
      }
    });
  });

  describe('createVibemateEntry', () => {
    it('creates entry with default command', () => {
      const entry = createVibemateEntry();
      expect(entry.command).toBe('npx');
      expect(entry.args).toContain('vibemate-mcp');
    });

    it('creates entry with API key', () => {
      const entry = createVibemateEntry({ apiKey: 'test-key' });
      expect(entry.env).toBeDefined();
      expect(entry.env?.ANTHROPIC_API_KEY).toBe('test-key');
    });

    it('creates entry without API key', () => {
      const entry = createVibemateEntry();
      expect(entry.env).toBeUndefined();
    });
  });

  describe('addServerToConfig', () => {
    it('adds vibemate to empty config', () => {
      const config = {};
      const entry = createVibemateEntry();
      const result = addServerToConfig(config, 'claude', entry);
      
      expect(result.mcpServers).toBeDefined();
      expect((result.mcpServers as Record<string, unknown>).vibemate).toBeDefined();
    });

    it('preserves existing servers', () => {
      const config = {
        mcpServers: {
          existing: { command: 'existing-server' }
        }
      };
      const entry = createVibemateEntry();
      const result = addServerToConfig(config, 'claude', entry);
      
      expect((result.mcpServers as Record<string, unknown>).existing).toBeDefined();
      expect((result.mcpServers as Record<string, unknown>).vibemate).toBeDefined();
    });

    it('uses correct MCP key for platform', () => {
      const config = {};
      const entry = createVibemateEntry();
      const result = addServerToConfig(config, 'opencode', entry);
      
      expect(result.mcp).toBeDefined();
      expect((result.mcp as Record<string, unknown>).vibemate).toBeDefined();
    });
  });

  describe('Platform configurations', () => {
    it('has all required platforms', () => {
      expect(PLATFORMS.claude).toBeDefined();
      expect(PLATFORMS.cursor).toBeDefined();
      expect(PLATFORMS.codex).toBeDefined();
      expect(PLATFORMS.kilocode).toBeDefined();
      expect(PLATFORMS.opencode).toBeDefined();
    });

    it('has valid config paths', () => {
      for (const platform of Object.values(PLATFORMS)) {
        expect(platform.configPath).toContain('.json');
        expect(platform.name).toBeDefined();
      }
    });
  });
});
