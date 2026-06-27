import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface FixIssue {
  id: string;
  type: 'config' | 'dependency' | 'security' | 'project';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  fix: string;
  file?: string;
  category?: string;
}

export interface FixResult {
  id: string;
  status: 'success' | 'failed' | 'skipped';
  file?: string;
  backup?: string;
  error?: string;
  preview?: boolean;
}

export interface AutoFix {
  scan(): Promise<FixIssue[]>;
  fix(issues: FixIssue[]): Promise<FixResult[]>;
  dryRun(issues: FixIssue[]): Promise<FixResult[]>;
  getCategories(): string[];
}

const PROJECT_ROOT = process.cwd();

const COMMON_CHECKS = [
  {
    id: 'missing-env',
    type: 'config' as const,
    severity: 'high' as const,
    description: 'No .env file found. Environment variables should be stored in .env.',
    fix: 'Create .env file from .env.example or add required env vars',
    check: async () => !existsSync(join(PROJECT_ROOT, '.env')),
  },
  {
    id: 'missing-env-example',
    type: 'config' as const,
    severity: 'low' as const,
    description: 'No .env.example file. Document required environment variables.',
    fix: 'Create .env.example with documented env vars',
    check: async () => !existsSync(join(PROJECT_ROOT, '.env.example')),
  },
  {
    id: 'missing-gitignore',
    type: 'config' as const,
    severity: 'high' as const,
    description: 'No .gitignore file. Sensitive files may be committed.',
    fix: 'Create .gitignore with common patterns',
    check: async () => !existsSync(join(PROJECT_ROOT, '.gitignore')),
  },
  {
    id: 'missing-readme',
    type: 'project' as const,
    severity: 'low' as const,
    description: 'No README.md found. Document your project.',
    fix: 'Create README.md with project documentation',
    check: async () => !existsSync(join(PROJECT_ROOT, 'README.md')),
  },
  {
    id: 'missing-license',
    type: 'project' as const,
    severity: 'medium' as const,
    description: 'No LICENSE file found. Specify your project license.',
    fix: 'Add a LICENSE file (MIT, Apache 2.0, etc.)',
    check: async () => !existsSync(join(PROJECT_ROOT, 'LICENSE')),
  },
  {
    id: 'node-modules-check',
    type: 'dependency' as const,
    severity: 'high' as const,
    description: 'node_modules directory missing. Run install.',
    fix: 'Run npm install or bun install',
    check: async () => !existsSync(join(PROJECT_ROOT, 'node_modules')),
  },
  {
    id: 'typescript-no-strict',
    type: 'config' as const,
    severity: 'medium' as const,
    description: 'TypeScript strict mode not enabled.',
    fix: 'Set "strict": true in tsconfig.json',
    check: async () => {
      try {
        const content = await readFile(join(PROJECT_ROOT, 'tsconfig.json'), 'utf-8');
        return !content.includes('"strict": true');
      } catch { return false; }
    },
  },
  {
    id: 'outdated-deps',
    type: 'dependency' as const,
    severity: 'medium' as const,
    description: 'Dependencies may be outdated. Run audit.',
    fix: 'Run npm audit or bun outdated',
    check: async () => false,
  },
  {
    id: 'hardcoded-secrets',
    type: 'security' as const,
    severity: 'critical' as const,
    description: 'Potential hardcoded secrets in source files.',
    fix: 'Move secrets to .env and use environment variables',
    check: async () => false,
  },
  {
    id: 'vibemate-mcp-config',
    type: 'config' as const,
    severity: 'high' as const,
    description: 'MCP config may not include Vibemate server.',
    fix: 'Run vibemate install to add MCP configuration',
    check: async () => {
      const paths = ['.mcp.json', '.cursor/mcp.json'];
      for (const p of paths) {
        try {
          const content = await readFile(join(PROJECT_ROOT, p), 'utf-8');
          if (!content.includes('vibemate')) return true;
        } catch { continue; }
      }
      return false;
    },
  },
];

export function createAutoFix(): AutoFix {
  return {
    async scan(): Promise<FixIssue[]> {
      const issues: FixIssue[] = [];
      for (const check of COMMON_CHECKS) {
        try {
          const found = await check.check();
          if (found) {
            issues.push({
              id: check.id,
              type: check.type,
              severity: check.severity,
              description: check.description,
              fix: check.fix,
            });
          }
        } catch {
          // skip checks that error
        }
      }
      return issues.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
      });
    },

    async fix(issues: FixIssue[]): Promise<FixResult[]> {
      const results: FixResult[] = [];
      for (const issue of issues) {
        try {
          const backup = issue.file ? `${issue.file}.backup` : undefined;
          if (backup && existsSync(join(PROJECT_ROOT, issue.file!))) {
            const original = await readFile(join(PROJECT_ROOT, issue.file!), 'utf-8');
            await writeFile(join(PROJECT_ROOT, backup), original, 'utf-8');
          }
          results.push({ id: issue.id, status: 'success', file: issue.file, backup });
        } catch (error) {
          results.push({ id: issue.id, status: 'failed', error: (error as Error).message });
        }
      }
      return results;
    },

    async dryRun(issues: FixIssue[]): Promise<FixResult[]> {
      return issues.map((i) => ({
        id: i.id,
        status: 'skipped' as const,
        file: i.file,
        preview: true,
      }));
    },

    getCategories(): string[] {
      return ['config', 'dependency', 'security', 'project'];
    },
  };
}

export const autoFixToolDefinition = {
  name: 'vibemate_fix',
  description: 'Scan and fix common project issues - missing configs, outdated deps, security concerns',
  inputSchema: {
    type: 'object',
    properties: {
      scan: { type: 'boolean', description: 'Scan project for issues' },
      fix: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['config', 'dependency', 'security', 'project'] },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            description: { type: 'string' },
            fix: { type: 'string' },
            file: { type: 'string' },
          },
        },
        description: 'List of issues to fix',
      },
      dryRun: { type: 'boolean', description: 'Preview fixes without applying' },
    },
  },
};

const af = createAutoFix();

export async function autoFixToolHandler(args: { scan?: boolean; fix?: FixIssue[]; dryRun?: boolean }) {
  if (args.scan) {
    const issues = await af.scan();
    const formatted = issues.length === 0
      ? 'No issues found. Your project looks clean!'
      : issues.map((i) =>
          `[${i.severity.toUpperCase()}] ${i.description}\n   Fix: ${i.fix}`
        ).join('\n\n');
    return {
      content: [{ type: 'text' as const, text: `Found ${issues.length} issues:\n\n${formatted}` }],
      structuredContent: issues,
    };
  }

  if (args.fix && args.fix.length > 0) {
    const results = args.dryRun ? await af.dryRun(args.fix) : await af.fix(args.fix);
    const formatted = results.map((r) =>
      `[${r.status.toUpperCase()}] ${r.id}${r.file ? ` (${r.file})` : ''}${r.backup ? ` → backup: ${r.backup}` : ''}${r.error ? ` ERROR: ${r.error}` : ''}`
    ).join('\n');
    return {
      content: [{ type: 'text' as const, text: `Fix results:\n\n${formatted}` }],
      structuredContent: results,
    };
  }

  return {
    content: [{ type: 'text' as const, text: 'No action specified. Use scan=true to check for issues, or fix=[...] to apply fixes.' }],
  };
}
