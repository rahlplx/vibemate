import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { HarnessCompiler } from '../../src/compiler/index.js';
import type { OKFBundle } from '../../src/types.js';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const mockBundle: OKFBundle = {
  root: '',
  version: '0.1',
  concepts: [],
};

let tmpDir: string;

async function makeCompiler(agent: 'kilocode' | 'antigravity' | 'openhands') {
  return new HarnessCompiler(tmpDir, agent);
}

describe('Compiler — Kilocode', () => {
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), 'vibemate-compile-')); });
  afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }); });

  it('compiles kilocode artifacts with correct paths', async () => {
    const compiler = await makeCompiler('kilocode');
    const result = await compiler.compile({ ...mockBundle, root: tmpDir }, ['vibe-plan', 'vibe-build']);

    expect(result.agent).toBe('kilocode');
    expect(result.config).toBe('.kilocode/plugin.json');
    expect(result.context).toBe('KILOCODE.md');
    expect(result.skills).toContain('.kilocode/skills/vibe-plan.md');
    expect(result.skills).toContain('.kilocode/skills/vibe-build.md');
  });

  it('creates KILOCODE.md context file', async () => {
    const compiler = await makeCompiler('kilocode');
    await compiler.compile({ ...mockBundle, root: tmpDir }, ['vibe-plan']);

    const { existsSync } = await import('fs');
    expect(existsSync(join(tmpDir, 'KILOCODE.md'))).toBe(true);
  });

  it('creates .kilocode/plugin.json config file', async () => {
    const compiler = await makeCompiler('kilocode');
    await compiler.compile({ ...mockBundle, root: tmpDir }, ['vibe-plan']);

    const { readFile } = await import('fs/promises');
    const pluginJson = JSON.parse(await readFile(join(tmpDir, '.kilocode', 'plugin.json'), 'utf-8'));
    expect(pluginJson.name).toBe('vibemate');
  });
});

describe('Compiler — Antigravity', () => {
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), 'vibemate-compile-')); });
  afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }); });

  it('compiles antigravity artifacts with correct paths', async () => {
    const compiler = await makeCompiler('antigravity');
    const result = await compiler.compile({ ...mockBundle, root: tmpDir }, ['vibe-plan']);

    expect(result.agent).toBe('antigravity');
    expect(result.config).toBe('.antigravity/config.json');
    expect(result.context).toBe('.antigravity/context.md');
    expect(result.skills).toContain('.antigravity/skills/vibe-plan.md');
  });

  it('creates .antigravity/context.md', async () => {
    const compiler = await makeCompiler('antigravity');
    await compiler.compile({ ...mockBundle, root: tmpDir }, ['vibe-plan']);

    const { existsSync } = await import('fs');
    expect(existsSync(join(tmpDir, '.antigravity', 'context.md'))).toBe(true);
  });
});

describe('Compiler — OpenHands', () => {
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), 'vibemate-compile-')); });
  afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }); });

  it('compiles openhands artifacts with correct paths', async () => {
    const compiler = await makeCompiler('openhands');
    const result = await compiler.compile({ ...mockBundle, root: tmpDir }, ['vibe-plan']);

    expect(result.agent).toBe('openhands');
    expect(result.config).toBe('.openhands/skills.toml');
    expect(result.context).toBe('AGENTS.md');
    expect(result.skills).toContain('.openhands/skills/vibe-plan.md');
  });

  it('creates .openhands/skills.toml with TOML format', async () => {
    const compiler = await makeCompiler('openhands');
    await compiler.compile({ ...mockBundle, root: tmpDir }, ['vibe-plan', 'vibe-build']);

    const { readFile } = await import('fs/promises');
    const tomlContent = await readFile(join(tmpDir, '.openhands', 'skills.toml'), 'utf-8');
    expect(tomlContent).toContain('[vibemate]');
    expect(tomlContent).toContain('.openhands/skills/vibe-plan.md');
  });

  it('creates AGENTS.md shared with codex', async () => {
    const compiler = await makeCompiler('openhands');
    await compiler.compile({ ...mockBundle, root: tmpDir }, ['vibe-plan']);

    const { existsSync } = await import('fs');
    expect(existsSync(join(tmpDir, 'AGENTS.md'))).toBe(true);
  });
});
