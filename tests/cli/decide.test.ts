import { describe, it, expect, afterEach , beforeEach} from 'bun:test';
import { decideCommand } from '../../src/cli/decide.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.join(process.cwd(), '.test-cli-decide');

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('decideCommand', () => {
  it('returns a command object', () => {
    const cmd = decideCommand();
    expect(cmd).toBeDefined();
    expect(cmd.name()).toBe('decide');
  });

  it('has description', () => {
    const cmd = decideCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('action: prints winner and score for database category', async () => {
    const dbPath = path.join(TEST_DIR, 'test.db');
    const cmd = decideCommand();
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    try {
      await cmd.parseAsync(['database', '--db', dbPath], { from: 'user' });
    } finally {
      console.log = orig;
    }
    expect(logs.some(l => l.includes('Winner:'))).toBe(true);
    expect(logs.some(l => l.includes('Score:'))).toBe(true);
  });

  it('action: filters by specified option IDs', async () => {
    const dbPath = path.join(TEST_DIR, 'test.db');
    const cmd = decideCommand();
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    try {
      await cmd.parseAsync(['database', '--db', dbPath, '--options', 'postgresql,sqlite'], { from: 'user' });
    } finally {
      console.log = orig;
    }
    expect(logs.some(l => l.includes('Winner:'))).toBe(true);
  });
});
