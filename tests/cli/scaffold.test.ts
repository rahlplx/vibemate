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
});
