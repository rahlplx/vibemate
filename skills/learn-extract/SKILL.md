# learn-extract

Extract metrics, patterns, and architecture data from a cloned repo.

## Trigger

When user says "extract metrics", "analyze codebase", "get patterns", or after learn-clone completes.

## Workflow

1. Call `extractData(repoPath)` from `src/learnings/extract.ts`
2. Report: architecture (entry points, layer violations, circular deps)
3. Report: patterns (design patterns, anti-patterns, coding style)
4. Report: quality (test ratio, error handling, complexity)
5. Report: dependencies (count, unused, vulnerable)

## Output

```json
{
  "architecture": {
    "entryPoints": ["src/index.ts"],
    "layerViolations": [],
    "circularDependencies": []
  },
  "patterns": {
    "designPatterns": [{"name": "Singleton", "confidence": 0.9}],
    "antiPatterns": [],
    "codingStyle": {"indentStyle": "spaces", "quoteStyle": "single"}
  },
  "quality": {
    "testToSourceRatio": 0.35,
    "errorHandling": "typed",
    "complexityScore": 2
  }
}
```
