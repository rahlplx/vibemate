import { SpecInput, SpecOutput, SpecOutputSchema } from './spec.js';
import type { StackProfile } from '../types.js';

export interface StackContext {
  framework?: string;
  language?: string;
  packageManager?: string;
  hasDatabase?: boolean;
  database?: string;
}

export function buildSystemPrompt(): string {
  return `You are an expert product specification generator. Your role is to analyze a product idea and generate a comprehensive, structured specification.

## Output Format
Return a JSON object with the following structure:
{
  "product": {
    "name": "string - product name",
    "oneLiner": "string - one sentence description",
    "problem": "string - problem being solved",
    "solution": "string - how the product solves it"
  },
  "personas": [{
    "name": "string - persona name",
    "description": "string - who this persona is",
    "painPoints": ["string - list of pain points"],
    "goals": ["string - list of goals"]
  }],
  "userFlows": [{
    "id": "string - flow identifier",
    "name": "string - flow name",
    "steps": ["string - numbered steps"]
  }],
  "dataModel": {
    "entities": [{
      "name": "string - entity name",
      "fields": [{
        "name": "string - field name",
        "type": "string - field type",
        "required": true,
        "description": "string - optional description"
      }]
    }],
    "relationships": [{
      "from": "string - source entity",
      "to": "string - target entity",
      "type": "one-to-one|one-to-many|many-to-many",
      "description": "string - relationship description"
    }]
  },
  "apiContract": {
    "style": "rest|trpc",
    "endpoints": [{
      "method": "GET|POST|PUT|DELETE",
      "path": "string - endpoint path",
      "description": "string - what this endpoint does"
    }]
  },
  "techStack": {
    "layers": [{
      "layer": "string - layer name (e.g., Frontend, Backend, Database)",
      "technology": "string - technology choice",
      "justification": "string - why this technology"
    }],
    "justification": "string - overall stack justification"
  },
  "fileStructure": [{
    "path": "string - file/directory path",
    "type": "file|directory",
    "description": "string - optional description"
  }],
  "milestones": [{
    "week": 1,
    "name": "string - milestone name",
    "deliverables": ["string - list of deliverables"]
  }],
  "risks": [{
    "category": "security|scaling|compliance|operational|technical",
    "severity": "critical|high|medium|low",
    "description": "string - risk description",
    "modification": "string - how to mitigate"
  }]
}

## Guidelines
1. Generate realistic, production-ready specifications
2. Include 2-4 user personas
3. Include 3-6 core user flows
4. Data model should cover all major entities
5. API endpoints should be RESTful or tRPC based on the stack
6. Tech stack recommendations should be justified
7. File structure should follow best practices
8. Milestones should be achievable in 1-week sprints
9. Identify security, scaling, and operational risks

## Stack Context
If stack information is provided, tailor your recommendations to that specific technology stack.`;
}

export function buildUserPrompt(idea: string, stack?: StackContext): string {
  let prompt = `Generate a complete product specification for the following idea:

"${idea}"`;

  if (stack) {
    prompt += `\n\n## Technology Stack Context`;
    if (stack.framework) prompt += `\n- Framework: ${stack.framework}`;
    if (stack.language) prompt += `\n- Language: ${stack.language}`;
    if (stack.packageManager) prompt += `\n- Package Manager: ${stack.packageManager}`;
    if (stack.hasDatabase) prompt += `\n- Database: ${stack.database || 'detected'}`;
  }

  prompt += `\n\nReturn the specification as a JSON object matching the schema defined in the system prompt.`;

  return prompt;
}

export function createSpecGenerator(config: { apiKey?: string; model?: string; maxRetries?: number }) {
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
  const model = config.model || 'claude-sonnet-4-20250514';
  const maxRetries = config.maxRetries ?? 2;

  return async function generateSpec(input: SpecInput, stackProfile?: StackProfile): Promise<SpecOutput> {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for spec generation');
    }

    const stackContext: StackContext | undefined = stackProfile ? {
      framework: stackProfile.framework,
      language: stackProfile.language,
      packageManager: stackProfile.packageManager,
      hasDatabase: stackProfile.hasDatabase,
      database: stackProfile.database
    } : undefined;

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(input.idea, stackContext);

    // Dynamic import to avoid issues in test environment
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await client.messages.create({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          throw new Error('Unexpected response type from Anthropic');
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(content.text);
        } catch (error) {
          console.error(`[SpecGenerator] Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw new Error('Failed to parse LLM response as JSON');
        }

        const result = SpecOutputSchema.safeParse(parsed);
        if (!result.success) {
          throw new Error(`Invalid spec output: ${result.error.message}`);
        }

        return result.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      }
    }

    throw lastError || new Error('Spec generation failed after retries');
  };
}
