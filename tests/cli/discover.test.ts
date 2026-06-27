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
});
