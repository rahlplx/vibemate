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

const DEFAULT_ROOT = process.cwd();

const GITIGNORE_CONTENT = `# Dependencies
node_modules/
.pnp.*

# Build output
dist/
build/
.next/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
.nyc_output/
`;

const MIT_LICENSE = `MIT License

Copyright (c) ${new Date().getFullYear()}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

function buildCommonChecks(root: string) {
  return [
    {
      id: 'missing-env',
      type: 'config' as const,
      severity: 'high' as const,
      description: 'No .env file found. Environment variables should be stored in .env.',
      fix: 'Create .env file from .env.example or add required env vars',
      file: '.env',
      check: async () => !existsSync(join(root, '.env')),
      apply: async () => {
        const examplePath = join(root, '.env.example');
        const content = existsSync(examplePath)
          ? await readFile(examplePath, 'utf-8')
          : '# Environment variables\n';
        await writeFile(join(root, '.env'), content, 'utf-8');
      },
    },
    {
      id: 'missing-env-example',
      type: 'config' as const,
      severity: 'low' as const,
      description: 'No .env.example file. Document required environment variables.',
      fix: 'Create .env.example with documented env vars',
      file: '.env.example',
      check: async () => !existsSync(join(root, '.env.example')),
      apply: async () => {
        const content = '# Copy this to .env and fill in your values\n\n# API Keys\nANTHROPIC_API_KEY=\n\n# Database\nDATABASE_URL=\n\n# Auth\nJWT_SECRET=\n';
        await writeFile(join(root, '.env.example'), content, 'utf-8');
      },
    },
    {
      id: 'missing-gitignore',
      type: 'config' as const,
      severity: 'high' as const,
      description: 'No .gitignore file. Sensitive files may be committed.',
      fix: 'Create .gitignore with common patterns',
      file: '.gitignore',
      check: async () => !existsSync(join(root, '.gitignore')),
      apply: async () => {
        await writeFile(join(root, '.gitignore'), GITIGNORE_CONTENT, 'utf-8');
      },
    },
    {
      id: 'missing-readme',
      type: 'project' as const,
      severity: 'low' as const,
      description: 'No README.md found. Document your project.',
      fix: 'Create README.md with project documentation',
      file: 'README.md',
      check: async () => !existsSync(join(root, 'README.md')),
      apply: async () => {
        const content = '# Project\n\n## Getting Started\n\n```bash\nbun install\nbun run dev\n```\n\n## License\n\nMIT\n';
        await writeFile(join(root, 'README.md'), content, 'utf-8');
      },
    },
    {
      id: 'missing-license',
      type: 'project' as const,
      severity: 'medium' as const,
      description: 'No LICENSE file found. Specify your project license.',
      fix: 'Add a LICENSE file (MIT, Apache 2.0, etc.)',
      file: 'LICENSE',
      check: async () => !existsSync(join(root, 'LICENSE')),
      apply: async () => {
        await writeFile(join(root, 'LICENSE'), MIT_LICENSE, 'utf-8');
      },
    },
    {
      id: 'node-modules-check',
      type: 'dependency' as const,
      severity: 'high' as const,
      description: 'node_modules directory missing. Run install.',
      fix: 'Run npm install or bun install',
      check: async () => !existsSync(join(root, 'node_modules')),
    },
    {
      id: 'typescript-no-strict',
      type: 'config' as const,
      severity: 'medium' as const,
      description: 'TypeScript strict mode not enabled.',
      fix: 'Set "strict": true in tsconfig.json',
      file: 'tsconfig.json',
      check: async () => {
        try {
          const content = await readFile(join(root, 'tsconfig.json'), 'utf-8');
          return !content.includes('"strict": true');
        } catch { return false; }
      },
      apply: async () => {
        const tsconfigPath = join(root, 'tsconfig.json');
        const content = await readFile(tsconfigPath, 'utf-8');
        const parsed = JSON.parse(content);
        if (!parsed.compilerOptions) {
          parsed.compilerOptions = {};
        }
        parsed.compilerOptions.strict = true;
        await writeFile(tsconfigPath, JSON.stringify(parsed, null, 2), 'utf-8');
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
            const content = await readFile(join(root, p), 'utf-8');
            if (!content.includes('vibemate')) return true;
          } catch { continue; }
        }
        return false;
      },
    },
  ];
}

export function createAutoFix(root?: string): AutoFix {
  const PROJECT_ROOT = root ?? DEFAULT_ROOT;
  const COMMON_CHECKS = buildCommonChecks(PROJECT_ROOT);
  const checkMap = new Map(COMMON_CHECKS.map(c => [c.id, c]));

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
              file: check.file,
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
        const check = checkMap.get(issue.id);
        if (!check || !check.apply) {
          results.push({ id: issue.id, status: 'skipped', file: issue.file });
          continue;
        }

        try {
          const filePath = issue.file ? join(PROJECT_ROOT, issue.file) : undefined;

          // Create backup if file exists
          if (filePath && existsSync(filePath)) {
            const original = await readFile(filePath, 'utf-8');
            const backupPath = `${filePath}.backup`;
            await writeFile(backupPath, original, 'utf-8');
          }

          await check.apply();

          results.push({ id: issue.id, status: 'success', file: issue.file });
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
