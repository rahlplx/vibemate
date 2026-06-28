import { describe, it, expect } from 'bun:test';
import { tokenBudgetGate, dlpGate, passRateGate } from '../../src/cli/harness-gates.js';

describe('tokenBudgetGate', () => {
  it('passes when cost is well under budget', () => {
    const check = tokenBudgetGate(1.0, 10.0);
    expect(check.status).toBe('pass');
    expect(check.name).toBe('Token Budget');
  });

  it('warns when cost exceeds 80% of budget', () => {
    const check = tokenBudgetGate(8.5, 10.0);
    expect(check.status).toBe('warn');
    expect(check.message).toContain('85');
  });

  it('warns at exactly 80% of budget', () => {
    const check = tokenBudgetGate(8.0, 10.0);
    expect(check.status).toBe('warn');
  });

  it('fails when cost meets or exceeds 100% of budget', () => {
    const check = tokenBudgetGate(10.0, 10.0);
    expect(check.status).toBe('fail');
  });

  it('fails when cost exceeds 100% of budget', () => {
    const check = tokenBudgetGate(11.5, 10.0);
    expect(check.status).toBe('fail');
  });

  it('passes at 79% of budget', () => {
    const check = tokenBudgetGate(7.9, 10.0);
    expect(check.status).toBe('pass');
  });

  it('includes percentage in message', () => {
    const check = tokenBudgetGate(5.0, 10.0);
    expect(check.message).toContain('50');
  });

  it('includes cost and budget in message', () => {
    const check = tokenBudgetGate(3.5, 10.0);
    expect(check.message).toContain('3.50');
    expect(check.message).toContain('10.00');
  });

  it('has a non-negative duration', () => {
    const check = tokenBudgetGate(1.0, 10.0);
    expect(check.duration).toBeGreaterThanOrEqual(0);
  });

  it('skips when maxBudget is 0 (no budget configured)', () => {
    const check = tokenBudgetGate(5.0, 0);
    expect(check.status).toBe('skip');
  });
});

describe('dlpGate', () => {
  it('passes on clean content', () => {
    const check = dlpGate('This is a normal handoff document with no secrets.');
    expect(check.status).toBe('pass');
    expect(check.name).toBe('DLP Scan');
  });

  it('fails when content contains an AWS key', () => {
    const check = dlpGate('key=AKIAIOSFODNN7EXAMPLE rest of document');
    expect(check.status).toBe('fail');
    expect(check.message).toContain('secret');
  });

  it('fails when content contains a GitHub token', () => {
    const check = dlpGate('token: ghp_1234567890abcdef1234567890abcdef123456');
    expect(check.status).toBe('fail');
  });

  it('fails when content contains a JWT', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const check = dlpGate(`Authorization: Bearer ${jwt}`);
    expect(check.status).toBe('fail');
  });

  it('fails when content contains a connection string', () => {
    const check = dlpGate('db=postgresql://user:password@localhost:5432/mydb');
    expect(check.status).toBe('fail');
  });

  it('fails when content contains an env var pattern', () => {
    const check = dlpGate('API_KEY=sk-abc123secret');
    expect(check.status).toBe('fail');
  });

  it('reports the count of detected secrets', () => {
    const check = dlpGate('AKIAIOSFODNN7EXAMPLE and ghp_1234567890abcdef1234567890abcdef123456');
    expect(check.status).toBe('fail');
    expect(check.message).toContain('2');
  });

  it('passes on empty string', () => {
    const check = dlpGate('');
    expect(check.status).toBe('pass');
  });

  it('has a non-negative duration', () => {
    const check = dlpGate('clean');
    expect(check.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('passRateGate', () => {
  it('passes when all tests pass', () => {
    const check = passRateGate(100, 100);
    expect(check.status).toBe('pass');
    expect(check.name).toBe('Test Pass Rate');
  });

  it('passes at exactly 95%', () => {
    const check = passRateGate(95, 100);
    expect(check.status).toBe('pass');
  });

  it('fails when pass rate is below 95%', () => {
    const check = passRateGate(94, 100);
    expect(check.status).toBe('fail');
    expect(check.message).toContain('94');
  });

  it('fails at 0 tests passing', () => {
    const check = passRateGate(0, 100);
    expect(check.status).toBe('fail');
  });

  it('skips when total is 0 (no tests found)', () => {
    const check = passRateGate(0, 0);
    expect(check.status).toBe('skip');
    expect(check.message).toContain('no tests');
  });

  it('includes pass rate percentage in message', () => {
    const check = passRateGate(97, 100);
    expect(check.message).toContain('97');
  });

  it('includes passed/total counts in message', () => {
    const check = passRateGate(950, 1000);
    expect(check.message).toContain('950');
    expect(check.message).toContain('1000');
  });

  it('has a non-negative duration', () => {
    const check = passRateGate(10, 10);
    expect(check.duration).toBeGreaterThanOrEqual(0);
  });
});
