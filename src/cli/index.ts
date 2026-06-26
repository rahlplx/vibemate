#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './init.js';
import { syncCommand } from './sync.js';
import { autoCommand } from './auto.js';
import { telemetryCommand } from './telemetry.js';
import { evolveCommand } from './evolve.js';
import { statusCommand } from './status.js';
import { discoverCommand } from './discover.js';
import { scaffoldCommand } from './scaffold.js';
import { decideCommand } from './decide.js';

const program = new Command();

program
  .name('vibemate')
  .description('Unified AI Coding Agent Plugin Platform - Write Once, Run Anywhere')
  .version('1.0.0');

initCommand(program);
syncCommand(program);
autoCommand(program);
telemetryCommand(program);
evolveCommand(program);
statusCommand(program);
program.addCommand(discoverCommand());
program.addCommand(scaffoldCommand());
program.addCommand(decideCommand());

program.parse();
