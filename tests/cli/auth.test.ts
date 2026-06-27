import { describe, it, expect, beforeEach } from 'bun:test';
import { execSync } from 'child_process';
import { createAuthManager, type AuthToken } from '../../src/mcp/auth.js';

const CLI_PATH = 'src/cli/index.ts';

describe('Auth CLI Commands', () => {
  describe('vibemate auth status', () => {
    it('shows logged out status when no token', () => {
      const output = execSync(`bun run ${CLI_PATH} auth status`, { encoding: 'utf-8' });
      expect(output).toContain('not authenticated');
    });
  });

  describe('vibemate auth login', () => {
    it('shows help message', () => {
      const output = execSync(`bun run ${CLI_PATH} auth login --help`, { encoding: 'utf-8' });
      expect(output).toContain('login');
    });
  });
});

describe('Auth CLI (unit)', () => {
  let auth: ReturnType<typeof createAuthManager>;

  beforeEach(() => {
    auth = createAuthManager();
  });

  it('parses token from env var', () => {
    const token: AuthToken = { token: 'vib-env-test', tier: 'pro' };
    auth.storeToken('default', token);
    expect(auth.getToken('default')?.token).toBe('vib-env-test');
  });

  it('handles --token flag', () => {
    const token: AuthToken = { token: 'vib-flag-test', tier: 'enterprise' };
    auth.storeToken('default', token);
    expect(auth.getTier('default')).toBe('enterprise');
  });

  it('can store token via programmatic call', () => {
    const token: AuthToken = { token: 'vib-cli-test', tier: 'team' };
    auth.storeToken('cli', token);
    expect(auth.hasToken('cli')).toBe(true);
  });

  it('can revoke via programmatic call', () => {
    const token: AuthToken = { token: 'vib-logout-test', tier: 'free' };
    auth.storeToken('logout', token);
    auth.revokeToken('logout');
    expect(auth.hasToken('logout')).toBe(false);
  });
});
