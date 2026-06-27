# /vibe:qa — Real Browser QA Testing

## Purpose
Test the application in a real browser environment for UI projects.

## Input
- Built application
- `.vibe/design/` (wireframes, components)

## Process
1. Start the application server
2. Launch browser (Playwright)
3. Navigate to key flows
4. Take screenshots at each step
5. Verify UI matches design
6. Check accessibility (axe-core)
7. Test responsive design
8. Validate error states

## Output
- `.vibe/qa/screenshots/` — Visual evidence
- `.vibe/qa-report.md` — Test results
- `.vibe/qa/accessibility.json` — a11y audit

## Quality Gates
- [ ] All critical flows work
- [ ] No visual regressions
- [ ] Accessibility score >90
- [ ] Responsive on mobile/tablet/desktop
