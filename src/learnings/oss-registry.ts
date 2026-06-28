export interface OSSEntry {
  url: string;
  description: string;
  teachesPatterns: string[];
  language: string;
  priority: 'high' | 'medium' | 'low';
}

export const OSS_REGISTRY: OSSEntry[] = [
  // ── MCP & AI tooling ─────────────────────────────────────────────────────
  {
    url: 'https://github.com/modelcontextprotocol/typescript-sdk',
    description: 'Reference implementation of the MCP protocol in TypeScript',
    teachesPatterns: ['mcp-protocol', 'tool-definition', 'server-transport', 'type-safety'],
    language: 'TypeScript',
    priority: 'high',
  },
  {
    url: 'https://github.com/anthropics/anthropic-sdk-js',
    description: 'Official Anthropic SDK — streaming, tool use, caching, token counting',
    teachesPatterns: ['llm-integration', 'streaming', 'tool-use', 'retry-logic', 'error-handling'],
    language: 'TypeScript',
    priority: 'high',
  },

  // ── Web server ────────────────────────────────────────────────────────────
  {
    url: 'https://github.com/honojs/hono',
    description: 'Lightweight web framework — SSE, middleware, routing, edge runtime',
    teachesPatterns: ['sse', 'middleware', 'request-validation', 'edge-routing'],
    language: 'TypeScript',
    priority: 'high',
  },

  // ── Schema & validation ───────────────────────────────────────────────────
  {
    url: 'https://github.com/colinhacks/zod',
    description: 'TypeScript-first schema validation — inference, coercion, error messages',
    teachesPatterns: ['schema-validation', 'type-inference', 'error-formatting', 'composable-types'],
    language: 'TypeScript',
    priority: 'high',
  },

  // ── CLI design ────────────────────────────────────────────────────────────
  {
    url: 'https://github.com/tj/commander.js',
    description: 'Commander.js — CLI argument parsing, subcommands, help generation',
    teachesPatterns: ['cli-design', 'argument-parsing', 'subcommand-structure'],
    language: 'JavaScript',
    priority: 'medium',
  },

  // ── Subprocess & security ─────────────────────────────────────────────────
  {
    url: 'https://github.com/sindresorhus/execa',
    description: 'Safe subprocess execution — injection prevention, piping, timeout',
    teachesPatterns: ['subprocess-security', 'command-injection-prevention', 'streaming-io'],
    language: 'JavaScript',
    priority: 'high',
  },

  // ── Testing patterns ──────────────────────────────────────────────────────
  {
    url: 'https://github.com/vitest-dev/vitest',
    description: 'Vitest — test runner design, snapshot testing, mock patterns',
    teachesPatterns: ['test-design', 'mock-patterns', 'snapshot-testing', 'coverage'],
    language: 'TypeScript',
    priority: 'medium',
  },
  {
    url: 'https://github.com/avajs/ava',
    description: 'AVA — concurrent async testing, minimal test structure',
    teachesPatterns: ['async-testing', 'test-isolation', 'concurrency'],
    language: 'JavaScript',
    priority: 'low',
  },

  // ── SQLite & state ────────────────────────────────────────────────────────
  {
    url: 'https://github.com/WiseLibs/better-sqlite3',
    description: 'better-sqlite3 — synchronous SQLite, transactions, prepared statements',
    teachesPatterns: ['sqlite-patterns', 'transactions', 'prepared-statements', 'migration'],
    language: 'JavaScript',
    priority: 'medium',
  },

  // ── TypeScript patterns ───────────────────────────────────────────────────
  {
    url: 'https://github.com/total-typescript/ts-reset',
    description: 'ts-reset — TypeScript safety improvements, stricter JSON types',
    teachesPatterns: ['typescript-safety', 'type-narrowing', 'strict-types'],
    language: 'TypeScript',
    priority: 'low',
  },
  {
    url: 'https://github.com/biomejs/biome',
    description: 'Biome — linting, formatting, TypeScript AST patterns',
    teachesPatterns: ['ast-analysis', 'linting-rules', 'code-formatting', 'static-analysis'],
    language: 'Rust',
    priority: 'medium',
  },

  // ── AI agent frameworks ───────────────────────────────────────────────────
  {
    url: 'https://github.com/assafelovic/gpt-researcher',
    description: 'GPT Researcher — agent orchestration, web research, RAG pipeline',
    teachesPatterns: ['agent-orchestration', 'rag-pipeline', 'research-agent', 'tool-routing'],
    language: 'Python',
    priority: 'medium',
  },

  // ── Error handling ────────────────────────────────────────────────────────
  {
    url: 'https://github.com/nicolo-ribaudo/tc39-proposal-temporal',
    description: 'TC39 Temporal — library design, typed errors, API ergonomics',
    teachesPatterns: ['api-design', 'typed-errors', 'immutability'],
    language: 'JavaScript',
    priority: 'low',
  },
];

export function getHighPriorityRepos(): OSSEntry[] {
  return OSS_REGISTRY.filter(e => e.priority === 'high');
}

export function getReposByPattern(pattern: string): OSSEntry[] {
  return OSS_REGISTRY.filter(e => e.teachesPatterns.includes(pattern));
}

export function getRepoUrls(priority?: OSSEntry['priority']): string[] {
  const entries = priority ? OSS_REGISTRY.filter(e => e.priority === priority) : OSS_REGISTRY;
  return entries.map(e => e.url);
}
