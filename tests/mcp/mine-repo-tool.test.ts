import { describe, it, expect } from 'bun:test';
import { mineRepoToolDefinition, mineRepoToolHandler } from '../../src/mcp/tools/mine-repo.js';
import { join } from 'path';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';

describe('mine_repo MCP tool definition', () => {
  it('has correct name', () => {
    expect(mineRepoToolDefinition.name).toBe('mine_repo');
  });

  it('has description', () => {
    expect(mineRepoToolDefinition.description.length).toBeGreaterThan(10);
  });

  it('requires url parameter', () => {
    expect(mineRepoToolDefinition.inputSchema.required).toContain('url');
  });

  it('has optional depth, dryRun, vibeDir parameters', () => {
    const props = mineRepoToolDefinition.inputSchema.properties!;
    expect(props['depth']).toBeDefined();
    expect(props['dryRun']).toBeDefined();
    expect(props['vibeDir']).toBeDefined();
  });
});

describe('mine_repo MCP tool handler', () => {
  const repoUrl = 'file://' + process.cwd();

  it('returns markdown summary and structuredContent for local path in dry-run', async () => {
    const vibeDir = await mkdtemp(join(tmpdir(), 'vibe-mine-tool-'));

    const result = await mineRepoToolHandler({
      url: repoUrl,
      dryRun: true,
      vibeDir,
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Repo Mining Result');
    expect(result.structuredContent).toBeDefined();
  });

  it('dry-run skips file writes', async () => {
    const vibeDir = await mkdtemp(join(tmpdir(), 'vibe-mine-tool-dry-'));

    const result = await mineRepoToolHandler({
      url: repoUrl,
      dryRun: true,
      vibeDir,
    });

    const text = result.content[0].text as string;
    expect(text).toContain('dry run');
  });

  it('includes language stats in summary', async () => {
    const vibeDir = await mkdtemp(join(tmpdir(), 'vibe-mine-tool-lang-'));

    const result = await mineRepoToolHandler({
      url: repoUrl,
      dryRun: true,
      vibeDir,
    });

    const text = result.content[0].text as string;
    expect(text).toContain('Languages');
  });

  it('structuredContent has url, analysis, jsonlRecordsWritten', async () => {
    const vibeDir = await mkdtemp(join(tmpdir(), 'vibe-mine-tool-struct-'));

    const result = await mineRepoToolHandler({
      url: repoUrl,
      dryRun: true,
      vibeDir,
    });

    const sc = result.structuredContent as Record<string, unknown>;
    expect(sc.url).toBe(repoUrl);
    expect(sc.analysis).toBeDefined();
    expect(typeof sc.jsonlRecordsWritten).toBe('number');
  });
});
