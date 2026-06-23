#!/usr/bin/env node
// Vibemate CLI - Unified AI Coding Agent Plugin Platform
import { Command } from 'commander';
import { initCommand } from './init.js';
import { syncCommand } from './sync.js';
import { autoCommand } from './auto.js';
import { telemetryCommand } from './telemetry.js';
import { evolveCommand } from './evolve.js';
import { statusCommand } from './status.js';

const program = new Command();

program
  .name('vibemate')
  .description('Unified AI Coding Agent Plugin Platform - Write Once, Run Anywhere')
  .version('1.0.0');

// Register commands
initCommand(program);
syncCommand(program);
autoCommand(program);
telemetryCommand(program);
evolveCommand(program);
statusCommand(program);

program.parse();
