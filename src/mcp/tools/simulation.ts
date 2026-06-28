import { z } from 'zod';
import type { ToolDefinition, ToolHandler, ToolResult } from '../types.js';
import { SimulationEngine } from '../../performance/simulation-engine.js';

export const SimulationInputSchema = z.object({
  iterations: z.number().default(100).describe('Number of simulation iterations to run'),
  concurrent: z.boolean().default(false).describe('Whether to run simulation tasks concurrently'),
  chaos: z.boolean().default(false).describe('Whether to inject chaos/failures into the simulation')
});

export type SimulationInput = z.infer<typeof SimulationInputSchema>;

export const simulationToolDefinition: ToolDefinition = {
  name: 'vibemate_run_simulation',
  description: 'Run the Vibemate performance and chaos simulation loop. This tool helps identify bottlenecks, bugs, and concurrency issues in the autonomous pipeline and core systems.',
  inputSchema: {
    type: 'object',
    properties: {
      iterations: {
        type: 'number',
        description: 'Number of simulation iterations to run (default: 100)'
      },
      concurrent: {
        type: 'boolean',
        description: 'Whether to run simulation tasks concurrently (default: false)'
      },
      chaos: {
        type: 'boolean',
        description: 'Whether to inject chaos and failures into the simulation (default: false)'
      }
    }
  }
};

export const simulationToolHandler: ToolHandler = async (args: unknown): Promise<ToolResult> => {
  const input = SimulationInputSchema.parse(args);

  try {
    const engine = new SimulationEngine();
    const result = await engine.run({
      iterations: input.iterations,
      concurrent: input.concurrent,
      chaos: input.chaos
    });

    let report = `# Simulation Report\n\n`;
    report += `- **Pass**: ${result.pass}\n`;
    report += `- **Fail**: ${result.fail}\n`;
    report += `- **Duration**: ${result.duration.toFixed(2)}ms\n\n`;

    if (result.bottlenecks.length > 0) {
      report += `## Bottlenecks Detected\n`;
      result.bottlenecks.forEach(b => { report += `- ${b}\n`; });
      report += `\n`;
    }

    if (result.concurrencyIssues.length > 0) {
      report += `## Concurrency Issues Detected\n`;
      result.concurrencyIssues.forEach(ci => { report += `- ${ci}\n`; });
      report += `\n`;
    }

    report += `## Metrics Summary\n`;
    report += `\`\`\`json\n${JSON.stringify(result.metrics, null, 2)}\n\`\`\`\n`;

    return {
      content: [{ type: 'text', text: report }],
      structuredContent: result
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{
        type: 'text',
        text: `# Simulation Failed\n\n${errorMessage}`
      }],
      structuredContent: { error: errorMessage }
    };
  }
};
