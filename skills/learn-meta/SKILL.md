# learn-meta

Generate meta learnings — what worked, what failed, why.

## Trigger

When user says "meta learnings", "what did we learn", "extract insights", or after learn-audit completes.

## Workflow

1. Call `generateMetaLearnings(data, findings, value)` from `src/learnings/meta.ts`
2. Categories: architecture, testing, tooling, process, patterns
3. For each: insight, evidence, confidence, applicable contexts
4. Sort by confidence (highest first)
5. Output actionable insights

## Output

```json
{
  "meta": [
    {
      "id": "meta-clean-arch",
      "category": "architecture",
      "insight": "Clean architecture with proper layer separation reduces coupling",
      "confidence": 0.9,
      "applicableTo": ["architecture", "new-projects"]
    }
  ]
}
```

## Meta Learning Types

- **Architecture**: structural decisions, layer separation, module boundaries
- **Testing**: test strategies, coverage patterns, TDD effectiveness
- **Tooling**: linters, type checkers, CI/CD impact
- **Process**: code review, documentation, release patterns
- **Patterns**: design pattern usage, anti-pattern avoidance
