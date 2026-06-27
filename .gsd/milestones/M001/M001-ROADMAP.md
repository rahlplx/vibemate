# M001-ROADMAP.md

## Milestone M001: MCP Foundation + Spec Generator

**Goal**: Deliver a working MCP server that generates production-ready specs from plain English ideas.

**Target**: End of Week 3 (per SPEC.md Phase 1)

**Risk Level**: Medium (depends on Anthropic API, MCP SDK stability)

### Slice Plan (in dependency order)

| Slice | Name | Risk | Dependencies | Est. Days | Demo |
|-------|------|------|--------------|-----------|------|
| S01 | MCP Server Setup | Low | None | 2 | `npx vibemate-mcp` starts, responds to initialize |
| S02 | Stack Detection | Low | S01 | 1 | Detects Next.js/Express/FastAPI/Laravel/generic |
| S03 | Spec Generator Skill | High | S01, S02 | 4 | Generates valid SPEC.md from idea |
| S04 | Config Injector | Medium | S01 | 2 | `npx vibemate install` writes correct config |
| S05 | CLI Entry Points | Low | S01, S04 | 1 | All 3 commands work |
| S06 | Auth Flow | Medium | S04 | 2 | OAuth flow works, token used in spec call |

### Critical Path
S01 → S02 → S03 (spec generation)  
S01 → S04 → S06 (install + auth)  
S05 can run parallel after S01

### Parallelization Opportunities
- S02 and S04 can run in parallel after S01
- S05 can run parallel after S01 + S04
- S06 runs after S04 complete

### Risk Mitigation
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Anthropic API changes | High | Low | Pin SDK version, abstract behind interface |
| MCP SDK breaking changes | High | Low | Pin to ^1.0, test against latest patch |
| Stack detection misses frameworks | Medium | Medium | Extensible detector, generic fallback |
| LLM output validation failures | High | Medium | Retry logic + template fallback |
| Config injection corrupts user config | High | Low | Backup before write, idempotent |

### Definition of Done (Milestone)
- [ ] All 33 tasks complete with passing tests
- [ ] `npx vibemate install` works on clean machine for all 5 platforms
- [ ] `vibemate_spec` tool generates valid SPEC.md for 3 test ideas
- [ ] 90%+ test coverage on core logic
- [ ] No TypeScript errors, strict mode
- [ ] Documentation: README with quickstart