export interface SubagentOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface SubagentResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  success: boolean;
}

export interface SubagentRunner {
  run(command: string, args: string[], options?: SubagentOptions): Promise<SubagentResult>;
}

export interface MockSubagentRunner extends SubagentRunner {
  calls: Array<{ command: string; args: string[]; options?: SubagentOptions }>;
}

export function createSubagentRunner(): SubagentRunner {
  return {
    async run(command, args, options = {}): Promise<SubagentResult> {
      const { cwd, env, timeoutMs = 300_000 } = options;

      const proc = Bun.spawn([command, ...args], {
        cwd,
        env: { ...process.env, ...env },
        stdout: 'pipe',
        stderr: 'pipe',
      });

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill();
      }, timeoutMs);

      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);

      clearTimeout(timer);

      const code = exitCode ?? -1;
      return {
        exitCode: code,
        stdout,
        stderr,
        timedOut,
        success: !timedOut && code === 0,
      };
    },
  };
}

export function createMockSubagentRunner(
  responses: Partial<SubagentResult>[] = [],
): MockSubagentRunner {
  let callCount = 0;
  const calls: MockSubagentRunner['calls'] = [];

  const defaults: SubagentResult = {
    exitCode: 0,
    stdout: '',
    stderr: '',
    timedOut: false,
    success: true,
  };

  const queue = responses.length > 0 ? responses : [defaults];

  return {
    calls,
    async run(command, args, options): Promise<SubagentResult> {
      calls.push({ command, args, options });
      const override = queue[callCount++ % queue.length] ?? {};
      const merged = { ...defaults, ...override };
      merged.success = !merged.timedOut && merged.exitCode === 0;
      return merged;
    },
  };
}
