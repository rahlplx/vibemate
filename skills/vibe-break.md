# /vibe:break — Milestone to Task Decomposition

## Purpose
Break milestones into atomic, implementable tasks with clear acceptance criteria.

## Input
- `.vibe/task-plan.md`
- `.vibe/design-doc.md`

## Process
1. For each milestone, identify all required changes
2. Break into atomic tasks (single file or single concern)
3. Add acceptance criteria to each task
4. Estimate complexity (1-20 scale)
5. Determine execution mode (inline/session/subagent)
6. Order tasks by dependency

## Output
`.vibe/tasks.json` containing:
```json
{
  "tasks": [
    {
      "id": "task-1",
      "title": "...",
      "description": "...",
      "milestone": "M1",
      "complexityScore": 5,
      "executionMode": "inline|session|subagent",
      "acceptanceCriteria": ["..."],
      "dependencies": [],
      "files": ["src/..."]
    }
  ]
}
```

## Quality Gates
- [ ] Every task has acceptance criteria
- [ ] Complexity scores are realistic
- [ ] Dependencies form a DAG (no cycles)
- [ ] Execution modes match complexity
