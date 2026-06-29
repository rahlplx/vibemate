import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runDoctor, type DoctorCheck } from '../../src/cli/doctor.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'vibemate-doctor-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('runDoctor', () => {
  it('returns an array of DoctorCheck results', async () => {
    const results = await runDoctor(root);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('each result has name, status, and message', async () => {
    const results = await runDoctor(root);
    for (const r of results) {
      expect(r.name).toBeDefined();
      expect(['pass', 'warn', 'fail']).toContain(r.status);
      expect(r.message).toBeDefined();
    }
  });

  it('reports warn for missing .vibe directory', async () => {
    const results = await runDoctor(root);
    const check = results.find(r => r.name === 'Vibe directory');
    expect(check).toBeDefined();
    expect(check?.status).not.toBe('pass');
  });

  it('reports pass for .vibe directory when it exists', async () => {
    mkdirSync(join(root, '.vibe'), { recursive: true });
    const results = await runDoctor(root);
    const check = results.find(r => r.name === 'Vibe directory');
    expect(check?.status).toBe('pass');
  });

  it('reports pass for ANTHROPIC_API_KEY when set', async () => {
    const orig = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key';
    try {
      const results = await runDoctor(root);
      const check = results.find(r => r.name === 'ANTHROPIC_API_KEY');
      expect(check?.status).toBe('pass');
    } finally {
      if (orig === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = orig;
    }
  });

  it('reports warn for missing ANTHROPIC_API_KEY', async () => {
    const orig = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const results = await runDoctor(root);
      const check = results.find(r => r.name === 'ANTHROPIC_API_KEY');
      expect(check?.status).toBe('warn');
    } finally {
      if (orig !== undefined) process.env.ANTHROPIC_API_KEY = orig;
    }
  });

  it('reports pass for tasks.json when present', async () => {
    mkdirSync(join(root, '.vibe'), { recursive: true });
    writeFileSync(join(root, '.vibe', 'tasks.json'), JSON.stringify({ tasks: [] }));
    const results = await runDoctor(root);
    const check = results.find(r => r.name === 'tasks.json');
    expect(check?.status).toBe('pass');
  });

  it('reports warn for missing tasks.json', async () => {
    const results = await runDoctor(root);
    const check = results.find(r => r.name === 'tasks.json');
    expect(check?.status).toBe('warn');
  });

  it('reports pass for MCP config when .mcp.json exists', async () => {
    writeFileSync(join(root, '.mcp.json'), JSON.stringify({ mcpServers: {} }));
    const results = await runDoctor(root);
    const check = results.find(r => r.name === 'MCP config');
    expect(check?.status).toBe('pass');
  });

  it('reports warn for missing .mcp.json', async () => {
    const results = await runDoctor(root);
    const check = results.find(r => r.name === 'MCP config');
    expect(check?.status).toBe('warn');
  });
});
