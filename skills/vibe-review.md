# /vibe:review — Multi-Perspective Code Review

## Purpose
Review code from security, performance, and quality perspectives.

## Input
- Source code changes
- `.vibe/harness-report.json`

## Process
1. **Security Review**:
   - Check for injection vulnerabilities
   - Validate input sanitization
   - Review authentication/authorization
   - Check for secrets in code

2. **Performance Review**:
   - Identify N+1 queries
   - Check for memory leaks
   - Review algorithm complexity
   - Validate caching strategy

3. **Code Quality Review**:
   - Check naming conventions
   - Review function complexity
   - Validate error handling
   - Check documentation

## Output
`.vibe/review-report.md` containing:
- Security findings (critical/high/medium/low)
- Performance findings
- Code quality findings
- Recommendations
- Overall assessment

## Quality Gates
- [ ] No critical security issues
- [ ] No performance regressions
- [ ] Code follows project conventions
- [ ] Error handling is comprehensive
