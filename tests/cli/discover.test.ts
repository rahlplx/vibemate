import { describe, it, expect, afterEach , beforeEach} from 'bun:test';
import { discoverCommand } from '../../src/cli/discover.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.join(process.cwd(), '.test-cli-discover');

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('discoverCommand', () => {
  it('returns a command object', () => {
    const cmd = discoverCommand();
    expect(cmd).toBeDefined();
    expect(cmd.name()).toBe('discover');
  });

  it('has description', () => {
    const cmd = discoverCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('action: starts discovery session and prints first question', async () => {
    const dbPath = path.join(TEST_DIR, 'test.db');
    const cmd = discoverCommand();
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    try {
      await cmd.parseAsync(['--type', 'saas', '--db', dbPath], { from: 'user' });
    } finally {
      console.log = orig;
    }
    expect(logs.some(l => l.includes('Question:'))).toBe(true);
    expect(logs.some(l => l.includes('Session ID:'))).toBe(true);
  });

  it('action: works for api project type', async () => {
    const dbPath = path.join(TEST_DIR, 'test.db');
    const cmd = discoverCommand();
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    try {
      await cmd.parseAsync(['--type', 'api', '--db', dbPath], { from: 'user' });
    } finally {
      console.log = orig;
    }
    expect(logs.some(l => l.includes('Progress:'))).toBe(true);
  });
});
