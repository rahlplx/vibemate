# learn-audit

Deep audit of a codebase — find issues, assess value, generate findings.

## Trigger

When user says "audit codebase", "deep audit", "quality review", or after learn-extract completes.

## Workflow

1. Call `audit(data)` from `src/learnings/analyze.ts`
2. Call `assessValue(data, findings)` for value assessment
3. Group findings by severity (critical → high → medium → low → info)
4. For each finding: evidence, recommendation, effort estimate
5. Calculate overall score (0-100) with dimension breakdown

## Output

```json
{
  "findings": [
    {
      "id": "arch-layer-violations",
      "severity": "high",
      "category": "architecture",
      "title": "Layer violations detected",
      "recommendation": "Refactor to follow hexagonal architecture",
      "effort": "medium",
      "impact": "high"
    }
  ],
  "value": {
    "overallScore": 72,
    "dimensions": {"architecture": 8, "testing": 6},
    "strengths": ["Clean architecture"],
    "weaknesses": ["Low test coverage"]
  }
}
```
