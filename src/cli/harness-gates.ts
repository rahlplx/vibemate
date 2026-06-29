import type { HarnessCheck } from '../types.js';

const DLP_PATTERNS = [
  { pattern: /AKIA[0-9A-Z]{16}/g, label: 'AWS key' },
  { pattern: /ghp_[A-Za-z0-9]{30,40}/g, label: 'GitHub token' },
  { pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, label: 'JWT' },
  { pattern: /(?:mongodb|postgresql|mysql|redis):\/\/[^\s]+/gi, label: 'connection string' },
  { pattern: /(?:API_KEY|SECRET|PASSWORD|TOKEN|PRIVATE_KEY)\s*[=:]\s*['"]?[^\s'"]+/gi, label: 'env var secret' },
];

export function tokenBudgetGate(totalCost: number, maxBudget: number): HarnessCheck {
  const start = performance.now();

  if (maxBudget === 0) {
    return {
      name: 'Token Budget',
      status: 'skip',
      message: 'No budget configured',
      duration: Math.round(performance.now() - start),
    };
  }

  const pct = (totalCost / maxBudget) * 100;
  const detail = `$${totalCost.toFixed(2)} of $${maxBudget.toFixed(2)} (${pct.toFixed(0)}%)`;

  if (pct >= 100) {
    return {
      name: 'Token Budget',
      status: 'fail',
      message: `Budget exhausted: ${detail}`,
      duration: Math.round(performance.now() - start),
    };
  }

  if (pct >= 80) {
    return {
      name: 'Token Budget',
      status: 'warn',
      message: `Budget warning: ${detail}`,
      duration: Math.round(performance.now() - start),
    };
  }

  return {
    name: 'Token Budget',
    status: 'pass',
    message: `Budget healthy: ${detail}`,
    duration: Math.round(performance.now() - start),
  };
}

export function dlpGate(content: string): HarnessCheck {
  const start = performance.now();
  let hitCount = 0;

  for (const { pattern } of DLP_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    const matches = content.match(re);
    if (matches) hitCount += matches.length;
  }

  if (hitCount > 0) {
    return {
      name: 'DLP Scan',
      status: 'fail',
      message: `${hitCount} potential secret${hitCount === 1 ? '' : 's'} detected in handoff docs`,
      duration: Math.round(performance.now() - start),
    };
  }

  return {
    name: 'DLP Scan',
    status: 'pass',
    message: 'No secrets detected',
    duration: Math.round(performance.now() - start),
  };
}

export function passRateGate(passed: number, total: number): HarnessCheck {
  const start = performance.now();

  if (total === 0) {
    return {
      name: 'Test Pass Rate',
      status: 'skip',
      message: 'no tests found',
      duration: Math.round(performance.now() - start),
    };
  }

  const pct = Math.round((passed / total) * 100);

  if (pct < 95) {
    return {
      name: 'Test Pass Rate',
      status: 'fail',
      message: `${pct}% pass rate (${passed}/${total}) — minimum 95% required`,
      duration: Math.round(performance.now() - start),
    };
  }

  return {
    name: 'Test Pass Rate',
    status: 'pass',
    message: `${pct}% pass rate (${passed}/${total})`,
    duration: Math.round(performance.now() - start),
  };
}
