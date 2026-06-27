import type { LSPConfig } from '../types.js';
import type { StackProfile } from '../mcp/types.js';

export function resolveLSPConfig(stack: Pick<StackProfile, 'language'>): LSPConfig[] {
  const configs: LSPConfig[] = [];

  switch (stack.language) {
    case 'typescript':
      configs.push({ name: 'typescript-language-server', command: 'typescript-language-server', args: ['--stdio'], language: 'typescript', installCmd: 'npm install -g typescript-language-server typescript' });
      configs.push({ name: 'eslint-language-server', command: 'vscode-eslint-language-server', args: ['--stdio'], language: 'typescript', installCmd: 'npm install -g vscode-langservers-extracted' });
      break;
    case 'javascript':
      configs.push({ name: 'typescript-language-server', command: 'typescript-language-server', args: ['--stdio'], language: 'javascript', installCmd: 'npm install -g typescript-language-server typescript' });
      break;
    case 'python':
      configs.push({ name: 'pylsp', command: 'pylsp', args: [], language: 'python', installCmd: 'pip install python-lsp-server' });
      break;
    case 'php':
      configs.push({ name: 'intelephense', command: 'intelephense', args: ['--stdio'], language: 'php', installCmd: 'npm install -g intelephense' });
      break;
  }

  return configs;
}
