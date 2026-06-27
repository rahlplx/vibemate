# /vibe:harness — Production Readiness Validation

## Purpose
Run comprehensive checks to validate production readiness.

## Input
- Source code (after build phase)
- `.vibe/state.json`

## Process
1. **Type Check**: `npx tsc --noEmit`
2. **Lint**: Run linter on all source files
3. **Unit Tests**: `bun test` (all tests)
4. **Integration Tests**: Run integration test suite
5. **Security**: Check for common vulnerabilities
6. **Performance**: Run performance benchmarks
7. **Coverage**: Check test coverage thresholds

## Output
`.vibe/harness-report.json` containing:
```json
{
  "timestamp": "...",
  "checks": [
    { "name": "Type Check", "status": "pass|fail|warn", "message": "...", "duration": 123 }
  ],
  "pass": 5,
  "fail": 0,
  "warn": 1,
  "overall": "pass|fail"
}
```

## Quality Gates
- [ ] All critical checks pass
- [ ] No security vulnerabilities
- [ ] Test coverage >80%
- [ ] No type errors
