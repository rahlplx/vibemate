# /vibe:build — TDD Execution with Subagent Dispatch

## Purpose
Implement tasks using test-driven development, dispatching to appropriate execution contexts.

## Input
- `.vibe/tasks.json`
- `.vibe/state.json` (current progress)

## Process
1. Load remaining tasks from tasks.json
2. For each task:
   a. Write failing test (RED)
   b. Implement minimal code (GREEN)
   c. Refactor if needed (REFACTOR)
   d. Verify acceptance criteria
3. Dispatch based on complexity:
   - Score ≤5: Inline execution
   - Score 6-15: Fresh session
   - Score >15: Subagent cascade
4. Update task status in state

## Output
- Updated source files
- Test files
- `.vibe/state.json` (updated task progress)
- Build output log

## Execution Modes
- **Inline**: Simple changes, <5 files, no context needed
- **Session**: Medium complexity, needs codebase context
- **Subagent**: High complexity, needs parallel work or deep context

## Quality Gates
- [ ] All tests pass
- [ ] Type check clean
- [ ] No lint errors
- [ ] Acceptance criteria met
