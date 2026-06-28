import { readFile, writeFile, copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

export type Platform = 'claude' | 'cursor' | 'codex' | 'kilocode' | 'opencode' | 'antigravity' | 'openhands';

export interface PlatformConfig {
  name: string;
  configPath: string;
  mcpKey: string;
}

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  claude: {
    name: 'Claude Code',
    configPath: join(homedir(), '.claude', 'claude_desktop_config.json'),
    mcpKey: 'mcpServers'
  },
  cursor: {
    name: 'Cursor',
    configPath: join(homedir(), '.cursor', 'mcp.json'),
    mcpKey: 'mcpServers'
  },
  codex: {
    name: 'Codex',
    configPath: join(homedir(), '.codex', 'config.json'),
    mcpKey: 'mcp'
  },
  kilocode: {
    name: 'Kilocode',
    configPath: join(homedir(), '.kilocode', 'mcp.json'),
    mcpKey: 'mcpServers'
  },
  opencode: {
    name: 'OpenCode',
    configPath: join(homedir(), '.config', 'opencode', 'opencode.json'),
    mcpKey: 'mcp'
  },
  // TODO: Verify antigravity config path against official Google AI coding agent docs
  antigravity: {
    name: 'Antigravity',
    configPath: join(homedir(), '.config', 'antigravity', 'mcp.json'),
    mcpKey: 'mcpServers'
  },
  openhands: {
    name: 'OpenHands',
    configPath: join(homedir(), '.openhands', 'config.toml'),
    mcpKey: 'mcpServers'
  }
};

export interface VibemateServerEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export function detectPlatform(): Platform | null {
  for (const [platform, config] of Object.entries(PLATFORMS)) {
    if (existsSync(config.configPath)) {
      return platform as Platform;
    }
  }
  return null;
}

export function getPlatformConfig(platform: Platform): PlatformConfig {
  return PLATFORMS[platform];
}

function isTomlPlatform(platform: Platform): boolean {
  return platform === 'openhands';
}

// Serialize a value to a valid TOML inline value
function toTomlValue(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v === null) return '""';
  if (Array.isArray(v)) return `[${v.map(toTomlValue).join(', ')}]`;
  if (typeof v === 'object') {
    const pairs = Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k} = ${toTomlValue(val)}`);
    return `{${pairs.join(', ')}}`;
  }
  return String(v);
}

function parseTOML(content: string): Record<string, unknown> {
  // Guard for Node.js fallback runtime — Bun.TOML is Bun-only
  if (typeof globalThis.Bun !== 'undefined') {
    return (globalThis.Bun as { TOML: { parse(s: string): unknown } }).TOML.parse(content) as Record<string, unknown>;
  }
  // Minimal TOML parser for simple section/key=value structures (sufficient for MCP config)
  const result: Record<string, unknown> = {};
  let currentSection: Record<string, unknown> = result;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      const key = sectionMatch[1];
      result[key] = {};
      currentSection = result[key] as Record<string, unknown>;
      continue;
    }
    const match = trimmed.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim();
      try { currentSection[key] = JSON.parse(val); } catch { currentSection[key] = val; }
    }
  }
  return result;
}

export async function readConfig(platform: Platform): Promise<Record<string, unknown>> {
  const config = PLATFORMS[platform];

  if (!existsSync(config.configPath)) {
    return {};
  }

  const content = await readFile(config.configPath, 'utf-8');
  if (isTomlPlatform(platform)) {
    return parseTOML(content);
  }
  return JSON.parse(content);
}

export async function writeConfig(platform: Platform, data: Record<string, unknown>): Promise<void> {
  const config = PLATFORMS[platform];

  // Ensure directory exists
  const dir = dirname(config.configPath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  if (isTomlPlatform(platform)) {
    // Serialize to valid TOML: top-level objects become [sections], scalars use inline values
    const lines: string[] = [];
    for (const [section, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        lines.push(`[${section}]`);
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          lines.push(`${k} = ${toTomlValue(v)}`);
        }
      } else {
        lines.push(`${section} = ${toTomlValue(value)}`);
      }
    }
    await writeFile(config.configPath, lines.join('\n') + '\n', 'utf-8');
    return;
  }

  await writeFile(config.configPath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function backupConfig(platform: Platform): Promise<string | null> {
  const config = PLATFORMS[platform];
  
  if (!existsSync(config.configPath)) {
    return null;
  }
  
  const backupPath = `${config.configPath}.backup.${Date.now()}`;
  await copyFile(config.configPath, backupPath);
  return backupPath;
}

export function createVibemateEntry(options?: { apiKey?: string }): VibemateServerEntry {
  const entry: VibemateServerEntry = {
    command: 'npx',
    args: ['-y', 'vibemate-mcp']
  };
  
  if (options?.apiKey) {
    entry.env = {
      ANTHROPIC_API_KEY: options.apiKey
    };
  }
  
  return entry;
}

export function addServerToConfig(
  config: Record<string, unknown>,
  platform: Platform,
  entry: VibemateServerEntry
): Record<string, unknown> {
  const platformConfig = PLATFORMS[platform];
  const mcpKey = platformConfig.mcpKey;
  
  const updated = { ...config };
  
  if (!updated[mcpKey] || typeof updated[mcpKey] !== 'object') {
    updated[mcpKey] = {};
  }
  
  const mcpSection = updated[mcpKey] as Record<string, unknown>;
  mcpSection['vibemate'] = entry;
  
  return updated;
}

export async function install(options?: { 
  platform?: Platform; 
  apiKey?: string;
  dryRun?: boolean;
}): Promise<{
  platform: Platform;
  backupPath: string | null;
  config: Record<string, unknown>;
}> {
  const platform = options?.platform || detectPlatform();
  
  if (!platform) {
    throw new Error('No supported AI coding tool detected. Please specify a platform.');
  }
  
  // Backup existing config
  const backupPath = await backupConfig(platform);
  
  // Read existing config
  const config = await readConfig(platform);
  
  // Create vibemate entry
  const entry = createVibemateEntry({ apiKey: options?.apiKey });
  
  // Add to config
  const updatedConfig = addServerToConfig(config, platform, entry);
  
  // Write unless dry run
  if (!options?.dryRun) {
    await writeConfig(platform, updatedConfig);
  }
  
  return {
    platform,
    backupPath,
    config: updatedConfig
  };
}
