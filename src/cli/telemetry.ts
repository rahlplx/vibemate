// Vibemate Telemetry Command - View and manage telemetry data
import { Command } from 'commander';
import { TelemetryCollector } from '../telemetry/collector.js';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

interface TelemetryOptions {
  action?: 'view' | 'export' | 'clear' | 'stats';
}

export function telemetryCommand(program: Command): void {
  program
    .command('telemetry')
    .description('View and manage telemetry data')
    .option('-a, --action <action>', 'Action to perform (view, export, clear, stats)', 'view')
    .action(async (options: TelemetryOptions) => {
      await manageTelemetry(options);
    });
}

async function manageTelemetry(options: TelemetryOptions): Promise<void> {
  const root = process.cwd();
  const telemetryDir = join(root, '.vibe', 'telemetry');

  const collector = new TelemetryCollector({
    enabled: true,
    exportDir: telemetryDir,
    serviceName: 'vibemate',
    serviceVersion: '1.0.0'
  });

  switch (options.action) {
    case 'view':
      await viewTelemetry(telemetryDir);
      break;
    case 'export':
      await collector.export();
      console.log('✅ Telemetry exported to', telemetryDir);
      break;
    case 'clear':
      await clearTelemetry(telemetryDir);
      break;
    case 'stats':
      await showStats(telemetryDir, collector);
      break;
    default:
      await viewTelemetry(telemetryDir);
  }
}

async function viewTelemetry(telemetryDir: string): Promise<void> {
  console.log('📊 Telemetry Data\n');

  try {
    const files = await readdir(telemetryDir);
    const telemetryFiles = files.filter(f => f.startsWith('telemetry-') && f.endsWith('.json'));

    if (telemetryFiles.length === 0) {
      console.log('No telemetry data found.');
      console.log(`\nRun ${colors.cyan('vibemate auto')} to generate telemetry data.`);
      return;
    }

    console.log(`Found ${telemetryFiles.length} telemetry files:\n`);

    // Show most recent
    const sortedFiles = telemetryFiles.sort().reverse();
    const recentFile = sortedFiles[0];
    
    const content = await readFile(join(telemetryDir, recentFile), 'utf-8');
    const data = JSON.parse(content);

    console.log(`Latest: ${recentFile}`);
    console.log(`  Service: ${data.serviceName}`);
    console.log(`  Export time: ${data.exportTime}`);
    console.log(`  Spans: ${data.spans.length}`);
    console.log(`  Metrics:`);
    console.log(`    Total tokens: ${data.metrics.totalTokens}`);
    console.log(`    Total cost: $${data.metrics.totalCost.toFixed(4)}`);
    console.log(`    Average latency: ${data.metrics.averageLatency.toFixed(0)}ms`);
    console.log(`    Error rate: ${(data.metrics.errorRate * 100).toFixed(2)}%`);
    console.log(`    Tool failure rate: ${(data.metrics.toolFailureRate * 100).toFixed(2)}%`);

    if (sortedFiles.length > 1) {
      console.log(`\nHistorical files: ${sortedFiles.length - 1}`);
    }

  } catch {
    console.log('No telemetry data found.');
    console.log(`\nRun ${colors.cyan('vibemate auto')} to generate telemetry data.`);
  }
}

async function clearTelemetry(telemetryDir: string): Promise<void> {
  console.log('🗑️  Clearing telemetry data...');
  
  try {
    const files = await readdir(telemetryDir);
    const telemetryFiles = files.filter(f => f.startsWith('telemetry-') && f.endsWith('.json'));
    
    for (const file of telemetryFiles) {
      const { unlink } = await import('fs/promises');
      await unlink(join(telemetryDir, file));
    }
    
    console.log(`✅ Cleared ${telemetryFiles.length} telemetry files`);
  } catch {
    console.log('No telemetry data to clear.');
  }
}

async function showStats(_telemetryDir: string, collector: TelemetryCollector): Promise<void> {
  console.log('📈 Telemetry Statistics\n');

  try {
    const history = await collector.loadHistory();
    
    if (history.length === 0) {
      console.log('No historical telemetry data found.');
      return;
    }

    // Aggregate metrics
    const totalTokens = history.reduce((sum, m) => sum + m.totalTokens, 0);
    const totalCost = history.reduce((sum, m) => sum + m.totalCost, 0);
    const avgLatency = history.reduce((sum, m) => sum + m.averageLatency, 0) / history.length;
    const avgErrorRate = history.reduce((sum, m) => sum + m.errorRate, 0) / history.length;

    console.log(`Historical data points: ${history.length}`);
    console.log(`\nAggregated Metrics:`);
    console.log(`  Total tokens used: ${totalTokens.toLocaleString()}`);
    console.log(`  Total cost: $${totalCost.toFixed(4)}`);
    console.log(`  Average latency: ${avgLatency.toFixed(0)}ms`);
    console.log(`  Average error rate: ${(avgErrorRate * 100).toFixed(2)}%`);

    // Trends
    if (history.length >= 2) {
      const recent = history[history.length - 1];
      const previous = history[history.length - 2];
      
      console.log(`\nTrends (vs previous):`);
      console.log(`  Tokens: ${recent.totalTokens > previous.totalTokens ? '📈' : '📉'} ${Math.abs(recent.totalTokens - previous.totalTokens).toLocaleString()}`);
      console.log(`  Cost: ${recent.totalCost > previous.totalCost ? '📈' : '📉'} $${Math.abs(recent.totalCost - previous.totalCost).toFixed(4)}`);
      console.log(`  Latency: ${recent.averageLatency > previous.averageLatency ? '📈' : '📉'} ${Math.abs(recent.averageLatency - previous.averageLatency).toFixed(0)}ms`);
    }

  } catch {
    console.log('No historical telemetry data found.');
  }
}

// Simple color helper
const colors = {
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`
};
