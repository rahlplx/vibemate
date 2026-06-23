// Vibemate - Unified AI Coding Agent Plugin Platform
// Write Once, Run Anywhere

// Core types
export * from './types.js';

// OKF (Open Knowledge Format) module
export { OKFGenerator } from './okf/generator.js';

// MCP (Model Context Protocol) module
export { MCPConfigGenerator } from './mcp/config.js';

// Harness Compiler module
export { HarnessCompiler } from './compiler/index.js';

// Context Engineering Pipeline
export { ContextPipeline } from './context/pipeline.js';

// Telemetry & Observability
export { TelemetryCollector, TelemetryServer } from './telemetry/collector.js';

// Self-Improvement Loop
export { 
  SelfImprovementOrchestrator,
  RetroAgent,
  EvolveAgent,
  LearnAgent
} from './evolve/index.js';

// Cost-Aware Router
export { CostAwareRouter, FallbackManager } from './router/index.js';

// Version
export const VERSION = '1.0.0';

// Description
export const DESCRIPTION = 'Unified AI Coding Agent Plugin Platform - Write Once, Run Anywhere';
