# /vibe:design — UI Generation & Approval

## Purpose
Generate UI designs, wireframes, and component structures for projects with UI requirements.

## Input
- `.vibe/design-doc.md`
- `.vibe/task-plan.md`
- Design system tokens (if available)

## Process
1. Analyze UI requirements from design doc
2. Generate wireframe descriptions
3. Define component hierarchy
4. Create design tokens (colors, typography, spacing)
5. Generate preview HTML/CSS
6. Get user approval

## Output
- `.vibe/design/` directory with:
  - `wireframes.md` — Layout descriptions
  - `components.md` — Component structure
  - `tokens.css` — Design tokens
  - `preview.html` — Visual preview

## Quality Gates
- [ ] All screens from design doc covered
- [ ] Component hierarchy is logical
- [ ] Design tokens consistent
- [ ] User approval obtained
