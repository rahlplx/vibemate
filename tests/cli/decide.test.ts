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
});
