import { describe, it, expect, afterEach , beforeEach} from 'bun:test';
import { scaffoldCommand } from '../../src/cli/scaffold.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.join(process.cwd(), '.test-cli-scaffold');

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('scaffoldCommand', () => {
  it('returns a command object', () => {
    const cmd = scaffoldCommand();
    expect(cmd).toBeDefined();
    expect(cmd.name()).toBe('scaffold');
  });

  it('has description', () => {
    const cmd = scaffoldCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('action: generates project files with default template', async () => {
    const cmd = scaffoldCommand();
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    try {
      await cmd.parseAsync(['my-project', '--dir', TEST_DIR], { from: 'user' });
    } finally {
      console.log = orig;
    }
    expect(logs.some(l => l.includes('Created files:'))).toBe(true);
    expect(logs.some(l => l.includes('files created'))).toBe(true);
  });

  it('action: generates api template', async () => {
    const cmd = scaffoldCommand();
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    try {
      await cmd.parseAsync(['api-project', '--template', 'api', '--dir', TEST_DIR], { from: 'user' });
    } finally {
      console.log = orig;
    }
    expect(logs.some(l => l.includes('files created'))).toBe(true);
  });
});
