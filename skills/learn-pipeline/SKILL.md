# learn-pipeline

Full learnings pipeline — clone → extract → audit → patterns → meta → rl → plan → execute.

## Trigger

When user says "learn from repo", "full analysis", "deep dive", "reverse engineer and plan", or provides a git URL with analysis intent.

## Workflow

1. Run `vibemate learn run <url>` or call `createPipeline()` from `src/learnings/orchestrator.ts`
2. Pipeline stages execute sequentially:
   - **clone**: Clone repo, install deps, detect stack
   - **instrument**: Run tests, build, collect traces
   - **extract**: Detect patterns, conventions, quality metrics
   - **audit**: Find issues, assess value
   - **patterns**: Recognize design/anti-patterns
   - **meta**: Generate meta learnings
   - **rl**: Generate reward signals
   - **generate**: Create TDD spec plan
3. Save report to `learnings/` directory
4. Display summary: findings, score, plan

## CLI

```bash
# Full pipeline on external repo
vibemate learn run https://github.com/user/repo.git

# Quick audit of local project
vibemate learn audit -d ./my-project
```

## Output

```
🚀 Starting learnings pipeline for: https://github.com/user/repo.git

📦 clone...
🔍 instrument...
📊 extract...
🔎 audit...
💎 value...
🧩 patterns...
🧠 meta...
🎯 rl...
📋 generate...
✅ complete

📊 Results:
   Findings: 12
   Meta learnings: 8
   RL signals: 9
   Spec plan: 4 slices, 32h

📄 Report: learnings/learnings-report-1234567890.md
```

## Output Files

- `learnings-report-*.md` — Full analysis report
- `spec-plan-*.md` — TDD workflow plan
- `pipeline-data-*.json` — Raw data for further processing
