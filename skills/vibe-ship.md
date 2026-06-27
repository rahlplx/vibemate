# /vibe:ship — Release Engineering

## Purpose
Create PR, run CI checks, and prepare for merge.

## Input
- All built artifacts
- `.vibe/review-report.md`
- `.vibe/harness-report.json`

## Process
1. Create feature branch (if not on one)
2. Stage all changes
3. Create conventional commit
4. Push to remote
5. Create PR with description
6. Wait for CI checks
7. Address any CI failures

## Output
- Git branch with commits
- PR link
- CI status

## Quality Gates
- [ ] All tests pass in CI
- [ ] No merge conflicts
- [ ] PR description is complete
- [ ] Branch name follows convention
