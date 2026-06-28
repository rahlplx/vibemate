// MCP Server Auto-Configuration with pinned versions
import { MCPConfig, MCPServerConfig } from '../types.js';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

// Pinned MCP server versions (June 2026)
const PINNED_MCP_SERVERS: Record<string, MCPServerConfig> = {
  context7: {
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp@0.1.3'],
    version: '0.1.3',
    env: {}
  },
  github: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github@0.6.0'],
    version: '0.6.0',
    env: {
      GITHUB_TOKEN: '${GITHUB_TOKEN}'
    }
  },
  playwright: {
    command: 'npx',
    args: ['-y', '@anthropic-ai/mcp-server-playwright@0.0.4'],
    version: '0.0.4',
    env: {}
  },
  filesystem: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem@0.1.0'],
    version: '0.1.0',
    env: {}
  },
  sqlite: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite@0.5.0'],
    version: '0.5.0',
    env: {}
  },
  fetch: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch@0.1.0'],
    version: '0.1.0',
    env: {}
  },
  puppeteer: {
    command: 'npx',
    args: ['-y', '@anthropic-ai/mcp-server-puppeteer@0.6.0'],
    version: '0.6.0',
    env: {}
  },
  sequentialthinking: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequentialthinking@0.1.0'],
    version: '0.1.0',
    env: {}
  },
  memory: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory@0.6.0'],
    version: '0.6.0',
    env: {}
  }
};

// Vibemate-specific MCP servers
const VIBEMATE_MCP_SERVERS: Record<string, MCPServerConfig> = {
  'vibemate-telemetry': {
    command: 'node',
    args: ['./dist/mcp/telemetry-server.js'],
    version: '1.0.0',
    env: {
      TELEMETRY_DIR: '${TELEMETRY_DIR:-.vibe/telemetry}'
    }
  },
  'vibemate-okf': {
    command: 'node',
    args: ['./dist/mcp/okf-server.js'],
    version: '1.0.0',
    env: {
      OKF_BUNDLE_DIR: '${OKF_BUNDLE_DIR:-.agents/okf-bundle}'
    }
  }
};

export interface MCPConfigGeneratorOptions {
  includeVibemateServers?: boolean;
  projectRoot: string;
  enabledServers?: string[];
}

export class MCPConfigGenerator {
  private root: string;
  private options: MCPConfigGeneratorOptions;

  constructor(options: MCPConfigGeneratorOptions) {
    this.root = options.projectRoot;
    this.options = options;
  }

  async generate(): Promise<MCPConfig> {
    const servers: Record<string, MCPServerConfig> = {};

    // Add standard MCP servers
    for (const [name, config] of Object.entries(PINNED_MCP_SERVERS)) {
      if (this.isServerEnabled(name)) {
        servers[name] = {
          ...config,
          env: this.resolveEnvVars(config.env || {})
        };
      }
    }

    // Add Vibemate-specific servers if enabled
    if (this.options.includeVibemateServers !== false) {
      for (const [name, config] of Object.entries(VIBEMATE_MCP_SERVERS)) {
        servers[name] = {
          ...config,
          env: this.resolveEnvVars(config.env || {})
        };
      }
    }

    return { mcpServers: servers };
  }

  private isServerEnabled(name: string): boolean {
    if (!this.options.enabledServers) return true;
    return this.options.enabledServers.includes(name);
  }

  private resolveEnvVars(env: Record<string, string>): Record<string, string> {
    const resolved: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      // Resolve ${VAR:-default} patterns
      const match = value.match(/^\$\{(\w+)(?::-(.+))?\}$/);
      if (match) {
        const [, varName, defaultVal] = match;
        resolved[key] = process.env[varName] || defaultVal || '';
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  async writeConfig(): Promise<string> {
    const config = await this.generate();
    const configPath = join(this.root, '.mcp.json');
    await writeFile(configPath, JSON.stringify(config, null, 2));
    return configPath;
  }

  async readConfig(): Promise<MCPConfig | null> {
    try {
      const configPath = join(this.root, '.mcp.json');
      const content = await readFile(configPath, 'utf-8');
      return JSON.parse(content) as MCPConfig;
    } catch (error) {
      console.error(`[MCPConfig] Failed to read config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    const config = await this.readConfig();
    if (!config) {
      return { valid: false, errors: ['No .mcp.json found'] };
    }

    const errors: string[] = [];
    
    for (const [name, server] of Object.entries(config.mcpServers)) {
      if (!server.command) {
        errors.push(`Server ${name}: missing command`);
      }
      if (!server.args || server.args.length === 0) {
        errors.push(`Server ${name}: missing args`);
      }
      if (!server.version) {
        errors.push(`Server ${name}: missing version (recommended for reproducibility)`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async checkHealth(): Promise<Record<string, { healthy: boolean; error?: string }>> {
    const results: Record<string, { healthy: boolean; error?: string }> = {};
    const config = await this.readConfig();
    
    if (!config) {
      return { global: { healthy: false, error: 'No config found' } };
    }

    for (const [name, server] of Object.entries(config.mcpServers)) {
      try {
        const { execFileSync } = await import('child_process');
        const cmd = server.command === 'npx' ? 'npx' : server.command;
        if (process.platform === 'win32') {
          execFileSync('where', [cmd], { stdio: 'ignore' });
        } else {
          execFileSync('which', [cmd], { stdio: 'ignore' });
        }
        results[name] = { healthy: true };
      } catch (error) {
        results[name] = { healthy: false, error: `Command not found: ${server.command} - ${error instanceof Error ? error.message : 'Unknown error'}` };
      }
    }

    return results;
  }

  getPinnedVersions(): Record<string, string> {
    const versions: Record<string, string> = {};
    for (const [name, config] of Object.entries(PINNED_MCP_SERVERS)) {
      versions[name] = config.version;
    }
    return versions;
  }

  getServerInfo(name: string): MCPServerConfig | undefined {
    return PINNED_MCP_SERVERS[name] || VIBEMATE_MCP_SERVERS[name];
  }
}
