# learn-plan

Generate spec-driven TDD workflow plan from learnings.

## Trigger

When user says "generate plan", "TDD plan", "spec plan", "what should we fix first", or after learn-audit completes.

## Workflow

1. Call `generateSpec(findings, value, meta, rl)` from `src/learnings/generator.ts`
2. Sort findings by severity → priority
3. Group by category into slices
4. For each finding: 4 tasks (plan → test → fix → verify)
5. Add meta-learning slice
6. Calculate effort estimates and risk levels
7. Call `formatPlan()` for markdown output

## Output

```markdown
# Quality improvement plan: 72/100 overall

## Security improvements (high risk)
| Task | Type | Minutes |
|------|------|---------|
| Plan fix for: XSS vulnerability | tdd | 30 |
| Write tests for: XSS vulnerability | tdd | 96 |
| Implement fix for: XSS vulnerability | implement | 96 |
| Verify fix for: XSS vulnerability | test | 48 |

## Meta-learning applications (low risk)
- [ ] Apply: Tests enable fearless refactoring
```

## Task Types

- **tdd**: Plan/write tests (RED phase)
- **implement**: Write production code (GREEN phase)
- **test**: Verify fix works (REFACTOR phase)
- **docs**: Documentation updates
