// vibemate_spec Tool Definition
import { z } from 'zod';
import type { ToolDefinition, ToolHandler, ToolResult, StackProfile } from '../types.js';

export const SpecInputSchema = z.object({
  idea: z.string().min(10).max(5000).describe('Plain English product description (e.g., "A time-tracking app for freelancers with invoicing")'),
  stack: z.object({
    framework: z.string().optional(),
    language: z.string().optional(),
    packageManager: z.string().optional(),
  }).optional().describe('Optional stack override'),
});

export type SpecInput = z.infer<typeof SpecInputSchema>;

export const SpecOutputSchema = z.object({
  product: z.object({
    name: z.string(),
    oneLiner: z.string(),
    problem: z.string(),
    solution: z.string(),
  }),
  personas: z.array(z.object({
    name: z.string(),
    description: z.string(),
    painPoints: z.array(z.string()),
    goals: z.array(z.string()),
  })),
  userFlows: z.array(z.object({
    id: z.string(),
    name: z.string(),
    steps: z.array(z.string()),
  })),
  dataModel: z.object({
    entities: z.array(z.object({
      name: z.string(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean(),
        description: z.string().optional(),
      })),
    })),
    relationships: z.array(z.object({
      from: z.string(),
      to: z.string(),
      type: z.enum(['one-to-one', 'one-to-many', 'many-to-many']),
      description: z.string(),
    })),
  }),
  apiContract: z.object({
    style: z.enum(['rest', 'trpc']),
    endpoints: z.array(z.object({
      method: z.string(),
      path: z.string(),
      description: z.string(),
      requestSchema: z.record(z.unknown()).optional(),
      responseSchema: z.record(z.unknown()).optional(),
    })),
  }),
  techStack: z.object({
    layers: z.array(z.object({
      layer: z.string(),
      technology: z.string(),
      justification: z.string(),
    })),
    justification: z.string(),
  }),
  fileStructure: z.array(z.object({
    path: z.string(),
    type: z.enum(['file', 'directory']),
    description: z.string().optional(),
  })),
  milestones: z.array(z.object({
    week: z.number(),
    name: z.string(),
    deliverables: z.array(z.string()),
  })),
  risks: z.array(z.object({
    category: z.enum(['security', 'scaling', 'compliance', 'operational', 'technical']),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    mitigation: z.string(),
  })),
});

export type SpecOutput = z.infer<typeof SpecOutputSchema>;

export const specToolDefinition: ToolDefinition = {
  name: 'vibemate_spec',
  description: 'Generate a complete product specification from a plain English idea. Returns a structured SPEC.md with PRD, personas, user flows, data model, API contracts, tech stack, folder structure, milestones, and risk flags.',
  inputSchema: {
    type: 'object',
    properties: {
      idea: { 
        type: 'string', 
        description: 'Plain English product description (e.g., "A time-tracking app for freelancers with invoicing")' 
      },
      stack: { 
        type: 'object', 
        description: 'Optional stack override',
        properties: {
          framework: { type: 'string' },
          language: { type: 'string' },
          packageManager: { type: 'string' }
        }
      }
    },
    required: ['idea']
  }
};

export function createSpecToolHandler(
  generateSpec: (input: SpecInput, stackProfile?: StackProfile) => Promise<SpecOutput>
): ToolHandler {
  return async (args: unknown): Promise<ToolResult> => {
    const input = SpecInputSchema.parse(args);
    
    try {
      const spec = await generateSpec(input);
      
      const markdown = formatSpecAsMarkdown(spec, input.idea);
      
      return {
        content: [{ type: 'text', text: markdown }],
        structuredContent: spec
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ 
          type: 'text', 
          text: `# Error Generating Specification\n\n${errorMessage}\n\nPlease try again with a more detailed description.` 
        }],
        structuredContent: { error: errorMessage }
      };
    }
  };
}

// Stub handler for MCP server registration (actual implementation uses createSpecToolHandler with LLM)
export const specToolHandler: ToolHandler = async (args: unknown): Promise<ToolResult> => {
  const input = SpecInputSchema.parse(args);
  return {
    content: [{ type: 'text', text: 'SPEC.md generation not yet implemented. Use createSpecToolHandler with a generateSpec function.' }],
    structuredContent: { status: 'pending', message: 'Implementation in S03', idea: input.idea }
  };
};

function formatSpecAsMarkdown(spec: SpecOutput, originalIdea: string): string {
  const sections: string[] = [];
  
  sections.push(`# ${spec.product.name}\n`);
  sections.push(`*Generated from: "${originalIdea}"*\n`);
  sections.push(`## One-Liner\n${spec.product.oneLiner}\n`);
  
  sections.push(`## Problem\n${spec.product.problem}\n`);
  sections.push(`## Solution\n${spec.product.solution}\n`);
  
  if (spec.personas.length > 0) {
    sections.push(`## User Personas`);
    for (const persona of spec.personas) {
      sections.push(`### ${persona.name}\n${persona.description}\n`);
      if (persona.painPoints.length > 0) {
        sections.push(`**Pain Points:** ${persona.painPoints.join(', ')}`);
      }
      if (persona.goals.length > 0) {
        sections.push(`**Goals:** ${persona.goals.join(', ')}`);
      }
      sections.push('');
    }
  }
  
  if (spec.userFlows.length > 0) {
    sections.push(`## Core User Flows`);
    for (const flow of spec.userFlows) {
      sections.push(`### ${flow.name}`);
      flow.steps.forEach((step, i) => {
        sections.push(`${i + 1}. ${step}`);
      });
      sections.push('');
    }
  }
  
  sections.push(`## Data Model`);
  for (const entity of spec.dataModel.entities) {
    sections.push(`### ${entity.name}`);
    sections.push('| Field | Type | Required | Description |');
    sections.push('|-------|------|----------|-------------|');
    for (const field of entity.fields) {
      sections.push(`| ${field.name} | ${field.type} | ${field.required ? 'Yes' : 'No'} | ${field.description || ''} |`);
    }
    sections.push('');
  }
  
  if (spec.dataModel.relationships.length > 0) {
    sections.push(`### Relationships`);
    for (const rel of spec.dataModel.relationships) {
      sections.push(`- **${rel.from}** ${rel.type} **${rel.to}** — ${rel.description}`);
    }
    sections.push('');
  }
  
  sections.push(`## API Contract (${spec.apiContract.style.toUpperCase()})`);
  sections.push('| Method | Endpoint | Description |');
  sections.push('|--------|----------|-------------|');
  for (const endpoint of spec.apiContract.endpoints) {
    sections.push(`| ${endpoint.method} | ${endpoint.path} | ${endpoint.description} |`);
  }
  sections.push('');
  
  sections.push(`## Tech Stack`);
  sections.push(`*${spec.techStack.justification}*\n`);
  sections.push('| Layer | Technology | Justification |');
  sections.push('|-------|------------|---------------|');
  for (const layer of spec.techStack.layers) {
    sections.push(`| ${layer.layer} | ${layer.technology} | ${layer.justification} |`);
  }
  sections.push('');
  
  sections.push(`## File Structure`);
  for (const item of spec.fileStructure) {
    const indent = '  '.repeat(item.path.split('/').length - 1);
    const prefix = item.type === 'directory' ? '📁' : '📄';
    sections.push(`${indent}${prefix} ${item.path}${item.description ? ` — ${item.description}` : ''}`);
  }
  sections.push('');
  
  sections.push(`## Milestones`);
  for (const milestone of spec.milestones) {
    sections.push(`### Week ${milestone.week}: ${milestone.name}`);
    for (const deliverable of milestone.deliverables) {
      sections.push(`- ${deliverable}`);
    }
    sections.push('');
  }
  
  if (spec.risks.length > 0) {
    sections.push(`## Enterprise Risk Flags`);
    for (const risk of spec.risks) {
      const badge = `**[${risk.severity.toUpperCase()}]**`;
      sections.push(`${badge} **${risk.category}**: ${risk.description}`);
      sections.push(`   *Mitigation: ${risk.mitigation}*\n`);
    }
  }
  
  return sections.join('\n');
}