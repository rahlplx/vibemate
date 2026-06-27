import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';
import type { AuthToken } from './auth.js';

const TOKEN_DIR = join(os.homedir(), '.config', 'vibemate');
const TOKEN_PATH = join(TOKEN_DIR, 'auth.json');

export interface TokenStore {
  load(): Record<string, AuthToken>;
  save(tokens: Record<string, AuthToken>): void;
  clear(): void;
}

export function createFileTokenStore(path?: string): TokenStore {
  const storePath = path ?? TOKEN_PATH;

  return {
    load(): Record<string, AuthToken> {
      if (!existsSync(storePath)) return {};
      try {
        const raw = readFileSync(storePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return {};
        return parsed as Record<string, AuthToken>;
      } catch {
        return {};
      }
    },

    save(tokens: Record<string, AuthToken>): void {
      const dir = join(storePath, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(storePath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
    },

    clear(): void {
      if (existsSync(storePath)) {
        writeFileSync(storePath, '{}');
      }
    },
  };
}

export function createMemoryTokenStore(): TokenStore {
  let store: Record<string, AuthToken> = {};

  return {
    load(): Record<string, AuthToken> {
      return { ...store };
    },

    save(tokens: Record<string, AuthToken>): void {
      store = { ...tokens };
    },

    clear(): void {
      store = {};
    },
  };
}
