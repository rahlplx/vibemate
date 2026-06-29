import { existsSync } from 'fs';
import { join } from 'path';

export interface DoctorCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export async function runDoctor(root: string): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const vibeDir = join(root, '.vibe');

  // .vibe directory
  checks.push(existsSync(vibeDir)
    ? { name: 'Vibe directory', status: 'pass', message: '.vibe/ exists' }
    : { name: 'Vibe directory', status: 'warn', message: '.vibe/ missing — run `vibemate auto` first' });

  // ANTHROPIC_API_KEY
  checks.push(process.env.ANTHROPIC_API_KEY
    ? { name: 'ANTHROPIC_API_KEY', status: 'pass', message: 'Set' }
    : { name: 'ANTHROPIC_API_KEY', status: 'warn', message: 'Not set — LLM phases will be skipped' });

  // tasks.json
  checks.push(existsSync(join(vibeDir, 'tasks.json'))
    ? { name: 'tasks.json', status: 'pass', message: 'Present' }
    : { name: 'tasks.json', status: 'warn', message: 'Not found — run BREAK phase to generate' });

  // SQLite state DB
  checks.push(existsSync(join(vibeDir, 'state.db'))
    ? { name: 'State DB', status: 'pass', message: '.vibe/state.db exists' }
    : { name: 'State DB', status: 'warn', message: '.vibe/state.db missing — will be created on first run' });

  // .mcp.json
  checks.push(existsSync(join(root, '.mcp.json'))
    ? { name: 'MCP config', status: 'pass', message: '.mcp.json present' }
    : { name: 'MCP config', status: 'warn', message: '.mcp.json missing — run `vibemate install`' });

  return checks;
}

export function formatDoctorResults(results: DoctorCheck[]): string {
  const icon = (s: DoctorCheck['status']) => s === 'pass' ? '✅' : s === 'warn' ? '⚠️ ' : '❌';
  const lines = results.map(r => `  ${icon(r.status)} ${r.name.padEnd(20)} ${r.message}`);
  const allPass = results.every(r => r.status === 'pass');
  lines.push('');
  lines.push(allPass ? '  All checks passed.' : `  ${results.filter(r => r.status !== 'pass').length} issue(s) found.`);
  return lines.join('\n');
}
