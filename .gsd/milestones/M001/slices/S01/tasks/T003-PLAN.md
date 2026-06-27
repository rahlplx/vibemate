# T003: Register vibemate_spec Tool

## Plan
Define and register the `vibemate_spec` tool with proper JSON schema and handler stub.

## Files
- `src/mcp/tools/spec.ts` - Tool definition and handler

## Tool Definition
```typescript
import { ToolDefinition, ToolHandler } from '../types.js';
import { z } from 'zod';

export const SpecInputSchema = z.object({
  idea: z.string().min(10).max(5000).describe('Plain English product description'),
  stack: z.object({
    framework: z.string().optional(),
    language: z.string().optional(),
    packageManager: z.string().optional(),
  }).optional().describe('Optional stack override'),
});

export type SpecInput = z.infer<typeof SpecInputSchema>;

export const specToolDefinition: ToolDefinition = {
  name: 'vibemate_spec',
  description: 'Generate a complete product specification from a plain English idea. Returns a structured SPEC.md with PRD, personas, user flows, data model, API contracts, tech stack, folder structure, milestones, and risk flags.',
  inputSchema: {
    type: 'object',
    properties: {
      idea: { type: 'string', description: 'Plain English product description (e.g., "A time-tracking app for freelancers with invoicing")' },
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

export const specToolHandler: ToolHandler = async (args: SpecInput) => {
  // TODO: Implement in S03
  // 1. Detect stack (or use override)
  // 2. Build prompt with stack context
  // 3. Call Anthropic API with JSON schema
  // 4. Validate response
  // 5. Format as SPEC.md
  // 6. Return tool result
  
  return {
    content: [{ type: 'text', text: 'SPEC.md generation not yet implemented' }],
    structuredContent: { status: 'pending', message: 'Implementation in S03' }
  };
};
```

## Must-Haves
- [ ] Tool registered in server tool registry
- [ ] Input schema matches SpecInputSchema
- [ ] Description is clear and actionable
- [ ] Handler stub returns pending status
- [ ] TypeScript compiles without errors

## Verification
```bash
# Test tool registration
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/index.js &
sleep 1
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node dist/index.js
# Verify vibemate_spec in response
```