# learn-patterns

Recognize design patterns, anti-patterns, and coding conventions.

## Trigger

When user says "find patterns", "recognize patterns", "detect conventions", or after learn-extract completes.

## Workflow

1. Call `findPatterns(data)` from `src/learnings/patterns.ts`
2. Report: design patterns (Singleton, Factory, Adapter, Builder, Observer, Strategy)
3. Report: anti-patterns (God File, Deep Nesting)
4. Report: coding style (indent, quotes, semicolons)
5. Report: conventions (eslint, prettier, typescript-strict, ci-cd)
6. Call `summarizePatterns()` for grouped output

## Output

```json
{
  "topDesignPatterns": [
    {"name": "Singleton", "confidence": 0.9, "lesson": "Use for global state management"}
  ],
  "topAntiPatterns": [
    {"name": "God File", "confidence": 0.9, "lesson": "Split into smaller modules"}
  ],
  "styleSummary": "Uses spaces with 2-space indent and single quotes",
  "conventionSummary": "ESLint + TypeScript strict configured"
}
```
