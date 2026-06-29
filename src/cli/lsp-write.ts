import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { LSPConfig } from '../types.js';
import type { StackProfile } from '../mcp/types.js';
import { resolveLSPConfig } from './lsp.js';

export async function writeLSPConfig(
  root: string,
  stack: Pick<StackProfile, 'language'>,
): Promise<LSPConfig[]> {
  const configs = resolveLSPConfig(stack);
  const vibeDir = join(root, '.vibemate');
  await mkdir(vibeDir, { recursive: true });
  await writeFile(join(vibeDir, 'lsp.json'), JSON.stringify(configs, null, 2));
  return configs;
}

export async function mergeLSPIntoManifests(root: string, lspConfigs: LSPConfig[]): Promise<void> {
  const pluginPath = join(root, '.claude-plugin', 'plugin.json');
  if (existsSync(pluginPath)) {
    const raw = await readFile(pluginPath, 'utf-8');
    const manifest = JSON.parse(raw) as Record<string, unknown>;
    manifest.lsp = lspConfigs;
    await writeFile(pluginPath, JSON.stringify(manifest, null, 2));
  }

  const ocPath = join(root, 'opencode.json');
  if (existsSync(ocPath)) {
    const raw = await readFile(ocPath, 'utf-8');
    const manifest = JSON.parse(raw) as Record<string, unknown>;
    manifest.lsp = lspConfigs;
    await writeFile(ocPath, JSON.stringify(manifest, null, 2));
  }
}
