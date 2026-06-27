#!/usr/bin/env node

import { Command } from 'commander';
import { install, detectPlatform } from '../mcp/installer.js';
import { createSpecGenerator } from '../mcp/tools/spec-generator.js';

const program = new Command();

program
  .name('vibemate')
  .description('Vibemate - AI-native product platform')
  .version('1.0.0');

program
  .command('install')
  .description('Install Vibemate MCP server into your AI coding tool')
  .option('-p, --platform <platform>', 'Target platform (claude, cursor, codex, kilocode, opencode)')
  .option('-k, --api-key <key>', 'Anthropic API key')
  .option('--dry-run', 'Show what would be installed without making changes')
  .action(async (options) => {
    try {
      const platform = options.platform || detectPlatform();
      
      if (!platform && !options.dryRun) {
        console.error('No supported AI coding tool detected. Please specify a platform with --platform.');
        process.exit(1);
      }
      
      console.log(`Installing Vibemate MCP server...`);
      
      const result = await install({
        platform: platform || 'claude',
        apiKey: options.apiKey,
        dryRun: options.dryRun
      });
      
      if (options.dryRun) {
        console.log('\nDry run - would install:');
        console.log(JSON.stringify(result.config, null, 2));
      } else {
        console.log(`\n✓ Installed to ${result.platform}`);
        if (result.backupPath) {
          console.log(`✓ Backup created: ${result.backupPath}`);
        }
        console.log('\nRestart your AI coding tool to use Vibemate.');
      }
    } catch (error) {
      console.error('Installation failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('spec')
  .description('Generate a product specification from a plain English idea')
  .argument('<idea>', 'Product idea description')
  .option('-k, --api-key <key>', 'Anthropic API key')
  .option('--stack <framework>', 'Target framework (nextjs, express, fastapi, laravel)')
  .action(async (idea, options) => {
    try {
      const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        console.error('API key required. Use --api-key or set ANTHROPIC_API_KEY environment variable.');
        process.exit(1);
      }
      
      console.log(`Generating specification for: "${idea}"\n`);
      
      const generator = createSpecGenerator({ apiKey });
      const spec = await generator({ 
        idea,
        stack: options.stack ? { framework: options.stack } : undefined
      });
      
      console.log(`# ${spec.product.name}`);
      console.log(`\n${spec.product.oneLiner}\n`);
      console.log(`## Problem`);
      console.log(`${spec.product.problem}\n`);
      console.log(`## Solution`);
      console.log(`${spec.product.solution}\n`);
      console.log(`## Personas`);
      for (const persona of spec.personas) {
        console.log(`- ${persona.name}: ${persona.description}`);
      }
      console.log(`\n## Data Model`);
      for (const entity of spec.dataModel.entities) {
        console.log(`- ${entity.name}: ${entity.fields.length} fields`);
      }
      console.log(`\n## API Endpoints`);
      for (const endpoint of spec.apiContract.endpoints) {
        console.log(`- ${endpoint.method} ${endpoint.path}`);
      }
    } catch (error) {
      console.error('Spec generation failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show Vibemate status')
  .action(() => {
    const platform = detectPlatform();
    console.log('Vibemate Status');
    console.log('───────────────');
    console.log(`Version: 1.0.0`);
    console.log(`Detected platform: ${platform || 'none'}`);
    console.log(`API Key: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'not set'}`);
  });

program.parse();
