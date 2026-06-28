import type { ToolDefinition, ToolHandler, ToolResult } from '../types.js';
import { mineRepo } from '../../learnings/repo-miner.js';

export const mineRepoToolDefinition: ToolDefinition = {
  name: 'mine_repo',
  description: 'Mine a GitHub or Git repository for architecture patterns, language stats, and deep-learning training data. Writes OKF markdown to .vibe/learnings/ and a JSONL record to .vibe/repo-learnings.jsonl.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Git repository URL to clone and analyze' },
      depth: { type: 'number', description: 'Number of commits to analyze (default: 100)' },
      dryRun: { type: 'boolean', description: 'If true, analyze without writing any files' },
      vibeDir: { type: 'string', description: 'Output directory (default: .vibe)' },
    },
    required: ['url'],
  },
};

export const mineRepoToolHandler: ToolHandler = async (args: unknown): Promise<ToolResult> => {
  const { url, depth, dryRun, vibeDir } = args as {
    url: string;
    depth?: number;
    dryRun?: boolean;
    vibeDir?: string;
  };

  const result = await mineRepo(url, {
    depth: depth ?? 100,
    dryRun: dryRun ?? false,
    vibeDir: vibeDir ?? '.vibe',
  });

  const { analysis } = result;
  const topLangs = Object.entries(analysis.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang, count]) => `${lang} (${count})`)
    .join(', ');

  const summary = [
    `## Repo Mining Result: ${url}`,
    ``,
    `**Languages**: ${topLangs || 'none detected'}`,
    `**Files**: ${analysis.fileCount}`,
    `**Commits analyzed**: ${analysis.commitCount}`,
    `**Patterns**: ${analysis.detectedPatterns.join(', ') || 'none'}`,
    `**Package manager**: ${analysis.packageManager ?? 'unknown'}`,
    `**Has tests**: ${analysis.hasTests}`,
    `**Has CI**: ${analysis.hasCI}`,
    ``,
    result.okfPath ? `OKF written to: ${result.okfPath}` : '(dry run — no files written)',
    result.jsonlRecordsWritten ? `JSONL records: ${result.jsonlRecordsWritten}` : '',
  ].filter(Boolean).join('\n');

  return {
    content: [{ type: 'text', text: summary }],
    structuredContent: result,
  };
};
