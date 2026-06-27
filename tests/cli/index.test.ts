import { describe, it, expect } from 'bun:test';
import { detectPlatform, PLATFORMS, Platform } from '../../src/mcp/installer.js';
import { execSync } from 'child_process';

describe('CLI Entry Points', () => {
  describe('Platform Detection', () => {
    it('detects platform or returns null', () => {
      const platform = detectPlatform();
      expect(platform === null || typeof platform === 'string').toBe(true);
    });

    it('all platforms have valid config', () => {
      for (const [key, config] of Object.entries(PLATFORMS)) {
        expect(config.name).toBeDefined();
        expect(config.configPath).toBeDefined();
        expect(config.mcpKey).toBeDefined();
      }
    });
  });

  describe('CLI Commands', () => {
    it('vibemate has version', () => {
      const output = execSync('bun run src/cli/index.ts --version', { 
        encoding: 'utf-8'
      });
      expect(output).toContain('1.0.0');
    });

    it('vibemate has help', () => {
      const output = execSync('bun run src/cli/index.ts --help', { 
        encoding: 'utf-8'
      });
      expect(output).toContain('Vibemate');
      expect(output).toContain('install');
      expect(output).toContain('spec');
    });

    it('vibemate status shows info', () => {
      const output = execSync('bun run src/cli/index.ts status', { 
        encoding: 'utf-8'
      });
      expect(output).toContain('Vibemate Status');
      expect(output).toContain('Version: 1.0.0');
    });
  });
});
