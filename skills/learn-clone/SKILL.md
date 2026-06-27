# learn-clone

Clone, install, and build an external repository for analysis.

## Trigger

When user says "clone repo", "analyze repo", "study codebase", "reverse engineer", or provides a git URL.

## Workflow

1. Parse the repo URL from user input
2. Call `cloneRepo()` from `src/learnings/clone.ts`
3. Report: branch, commit, file count, languages, package manager
4. Report: test presence, CI presence, setup duration
5. Store result for downstream pipeline steps

## Output

```json
{
  "path": "/tmp/workdir/repo-name",
  "branch": "main",
  "commitHash": "abc1234",
  "fileCount": 150,
  "languages": { "TypeScript": 80, "JavaScript": 20 },
  "packageManager": "bun",
  "hasTests": true,
  "hasCI": true,
  "setupDuration": 15000
}
```

## Example

```bash
vibemate learn run https://github.com/user/repo.git
```
