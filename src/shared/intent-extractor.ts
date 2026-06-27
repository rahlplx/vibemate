import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

export const IntentSchema = z.object({
  action: z.enum([
    "create",
    "modify",
    "fix",
    "explain",
    "review",
    "test",
    "deploy",
    "refactor",
    "optimize",
    "document",
    "unknown",
  ]),
  target: z.string().describe("What the action applies to (e.g., 'auth module', 'API endpoint', 'test suite')"),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().describe("Why this intent was inferred"),
  subIntents: z.array(z.object({
    action: z.string(),
    target: z.string(),
  })).optional().describe("Related sub-tasks if the main intent is complex"),
  context: z.object({
    urgency: z.enum(["low", "medium", "high", "critical"]),
    scope: z.enum(["file", "module", "project", "system"]),
    complexity: z.enum(["trivial", "simple", "moderate", "complex"]),
  }),
})

export type Intent = z.infer<typeof IntentSchema>

export interface IntentExtractor {
  extract(input: string): Promise<Intent>
}

export function createIntentExtractor(apiKey?: string): IntentExtractor {
  const client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY })

  return {
    async extract(input: string): Promise<Intent> {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Analyze this user request and extract the intent. Return JSON matching this schema:

{
  "action": "create|modify|fix|explain|review|test|deploy|refactor|optimize|document|unknown",
  "target": "what the action applies to",
  "confidence": 0.0-1.0,
  "reasoning": "why this intent was inferred",
  "subIntents": [{"action": "...", "target": "..."}] (optional, for complex requests),
  "context": {
    "urgency": "low|medium|high|critical",
    "scope": "file|module|project|system",
    "complexity": "trivial|simple|moderate|complex"
  }
}

User request: "${input}"`,
          },
        ],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : ""
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return {
          action: "unknown",
          target: input.slice(0, 100),
          confidence: 0.1,
          reasoning: "Could not parse LLM response",
          context: { urgency: "low", scope: "file", complexity: "simple" },
        }
      }

      const parsed = JSON.parse(jsonMatch[0])
      return IntentSchema.parse(parsed)
    },
  }
}

export function createMockIntentExtractor(responses?: Intent[]): IntentExtractor {
  let callCount = 0
  const defaultResponses: Intent[] = [
    {
      action: "create",
      target: "test module",
      confidence: 0.9,
      reasoning: "User wants to create something new",
      context: { urgency: "low", scope: "module", complexity: "moderate" },
    },
  ]

  const queue = responses ?? defaultResponses

  return {
    async extract(_input: string): Promise<Intent> {
      return queue[callCount++ % queue.length]
    },
  }
}
