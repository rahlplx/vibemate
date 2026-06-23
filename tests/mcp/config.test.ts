// TDD Tests for MCP Config Generator
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPConfigGenerator } from '../../src/mcp/config.js';
import { mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MCPConfigGenerator', () => {
  let testDir: string;
  let generator: MCPConfigGenerator;

  beforeEach(async () => {
    testDir = join(tmpdir(), `mcp-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    generator = new MCPConfigGenerator({
      projectRoot: testDir,
      includeVibemateServers: true
    });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('generate', () => {
    it('should generate MCP config with standard servers', async () => {
      const config = await generator.generate();

      expect(config).toBeDefined();
      expect(config.mcpServers).toBeDefined();
      expect(Object.keys(config.mcpServers).length).toBeGreaterThan(0);
    });

    it('should include Context7 with pinned version', async () => {
      const config = await generator.generate();

      expect(config.mcpServers.context7).toBeDefined();
      expect(config.mcpServers.context7.version).toBe('0.1.3');
      expect(config.mcpServers.context7.command).toBe('npx');
      expect(config.mcpServers.context7.args).toContain('@upstash/context7-mcp@0.1.3');
    });

    it('should include GitHub MCP with pinned version', async () => {
      const config = await generator.generate();

      expect(config.mcpServers.github).toBeDefined();
      expect(config.mcpServers.github.version).toBe('0.6.0');
      expect(config.mcpServers.github.env).toHaveProperty('GITHUB_TOKEN');
    });

    it('should include Playwright MCP with pinned version', async () => {
      const config = await generator.generate();

      expect(config.mcpServers.playwright).toBeDefined();
      expect(config.mcpServers.playwright.version).toBe('0.0.4');
    });

    it('should include Vibemate-specific servers', async () => {
      const config = await generator.generate();

      expect(config.mcpServers['vibemate-telemetry']).toBeDefined();
      expect(config.mcpServers['vibemate-okf']).toBeDefined();
    });

    it('should exclude Vibemate servers when disabled', async () => {
      const gen = new MCPConfigGenerator({
        projectRoot: testDir,
        includeVibemateServers: false
      });

      const config = await gen.generate();

      expect(config.mcpServers['vibemate-telemetry']).toBeUndefined();
      expect(config.mcpServers['vibemate-okf']).toBeUndefined();
    });
  });

  describe('writeConfig', () => {
    it('should write .mcp.json file', async () => {
      const configPath = await generator.writeConfig();

      expect(configPath).toContain('.mcp.json');
      
      const content = await readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      
      expect(config.mcpServers).toBeDefined();
    });
  });

  describe('readConfig', () => {
    it('should read existing config', async () => {
      await generator.writeConfig();
      
      const config = await generator.readConfig();
      
      expect(config).toBeDefined();
      expect(config?.mcpServers).toBeDefined();
    });

    it('should return null if no config exists', async () => {
      const config = await generator.readConfig();
      
      expect(config).toBeNull();
    });
  });

  describe('validateConfig', () => {
    it('should validate a correct config', async () => {
      await generator.writeConfig();
      
      const result = await generator.validateConfig();
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect missing command', async () => {
      // Write invalid config
      const { writeFile } = await import('fs/promises');
      await writeFile(join(testDir, '.mcp.json'), JSON.stringify({
        mcpServers: {
          test: { args: ['test'], version: '1.0.0' }
        }
      }));

      const result = await generator.validateConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('missing command'))).toBe(true);
    });
  });

  describe('getPinnedVersions', () => {
    it('should return all pinned versions', () => {
      const versions = generator.getPinnedVersions();

      expect(versions).toBeDefined();
      expect(versions.context7).toBe('0.1.3');
      expect(versions.github).toBe('0.6.0');
      expect(versions.playwright).toBe('0.0.4');
    });
  });

  describe('getServerInfo', () => {
    it('should return info for known server', () => {
      const info = generator.getServerInfo('context7');

      expect(info).toBeDefined();
      expect(info?.version).toBe('0.1.3');
    });

    it('should return undefined for unknown server', () => {
      const info = generator.getServerInfo('nonexistent');

      expect(info).toBeUndefined();
    });
  });
});
