import { describe, it, expect } from 'bun:test';
import { MCPConfigGenerator } from '../../src/mcp/config.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir } from 'fs/promises';

describe('MCPConfigGenerator — memory + sequentialthinking', () => {
  it('includes memory server in PINNED_MCP_SERVERS', async () => {
    const root = join(tmpdir(), `mcp-test-${crypto.randomUUID()}`);
    await mkdir(root, { recursive: true });

    const gen = new MCPConfigGenerator({ projectRoot: root, includeVibemateServers: false });
    const config = await gen.generate();

    expect(config.mcpServers).toHaveProperty('memory');
    expect(config.mcpServers.memory.command).toBe('npx');
    expect(config.mcpServers.memory.args.some(a => a.includes('@modelcontextprotocol/server-memory'))).toBe(true);
  });

  it('includes sequentialthinking server in PINNED_MCP_SERVERS', async () => {
    const root = join(tmpdir(), `mcp-test-${crypto.randomUUID()}`);
    await mkdir(root, { recursive: true });

    const gen = new MCPConfigGenerator({ projectRoot: root, includeVibemateServers: false });
    const config = await gen.generate();

    expect(config.mcpServers).toHaveProperty('sequentialthinking');
  });

  it('enabledServers filter includes memory when listed', async () => {
    const root = join(tmpdir(), `mcp-test-${crypto.randomUUID()}`);
    await mkdir(root, { recursive: true });

    const gen = new MCPConfigGenerator({
      projectRoot: root,
      includeVibemateServers: false,
      enabledServers: ['memory', 'sequentialthinking']
    });
    const config = await gen.generate();

    expect(Object.keys(config.mcpServers)).toContain('memory');
    expect(Object.keys(config.mcpServers)).toContain('sequentialthinking');
    expect(Object.keys(config.mcpServers)).not.toContain('github');
  });

  it('getPinnedVersions includes memory entry', async () => {
    const root = join(tmpdir(), `mcp-test-${crypto.randomUUID()}`);
    await mkdir(root, { recursive: true });

    const gen = new MCPConfigGenerator({ projectRoot: root });
    const versions = gen.getPinnedVersions();

    expect(versions).toHaveProperty('memory');
    expect(typeof versions.memory).toBe('string');
  });
});
