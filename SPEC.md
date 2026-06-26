# Vibemate — Product Specification

> **Version:** 0.2 (Planning)
> **Status:** Draft — updated with UI Utilities + Telemetry & Evolve Pipeline pillars

---

## 1. What Is Vibemate?

Vibemate is a universal toolkit that gives vibe coders — people building products with AI coding assistants but without deep engineering backgrounds — the same enterprise-grade patterns, guardrails, and knowledge that 50-person engineering teams have.

It ships as an **MCP (Model Context Protocol) server** that plugs into any AI coding platform (Claude Code, Cursor, Codex, Kilocode, OpenCode, and more). Once connected, the vibe coder gains access to curated, security-vetted skills that generate production-quality code, audit their app for missing enterprise patterns, and guide them from vague idea to full technical spec.

**The core promise:** A solo founder with zero engineering background can ship a product that is indistinguishable from one built by an enterprise team.

---

## 2. Target Users

| Persona | Who They Are | Their Pain |
|---|---|---|
| **The Solo Founder** | Non-technical, building first SaaS with AI | Ships fast but doesn't know what they're missing (no auth hardening, no payment webhooks, no error monitoring) |
| **The AI-First Developer** | Technical enough to code but relies on AI for speed | AI generates working code but not production patterns; lacks enterprise experience |
| **The Early Startup Team** | 2–5 people, no senior engineers | Moving fast, no one to review for security, scalability, or reliability |

**All three share one problem:** They don't know what they don't know.

---

## 3. How Users Experience Vibemate

### One-Time Setup (30 seconds)
```bash
# Install Vibemate MCP server
npx vibemate install

# Add to Claude Code
# → Adds entry to .mcp.json automatically

# Add to Cursor
# → Adds entry to .cursor/mcp.json automatically

# Add to Codex / Kilocode / OpenCode
# → Universal MCP config applied
```

### Daily Usage (inside their coding tool)
The vibe coder types naturally in their AI coding tool:
- *"Vibemate, turn my idea into a full spec and architecture"*
- *"Vibemate, add enterprise-grade auth to my app"*
- *"Vibemate, audit my app and tell me what's missing"*
- *"Vibemate, add Stripe payments with all edge cases"*

Vibemate's MCP skills respond with context-aware, stack-specific, production-grade output — not generic boilerplate.

---

## 4. Features

### MVP (Launch Set)

#### Skill 1 — Spec & Architecture Generator (FREE)
**Trigger:** `/vibemate spec [idea]` or natural language
**Input:** Plain English product idea
**Output:**
- Full product requirements document (PRD)
- User personas
- Core user flows
- Data model (entities + relationships)
- API contract (REST or tRPC)
- Tech stack recommendation with justification
- Folder/file structure
- Milestone breakdown (Week 1, Week 2, Week 3...)
- Risk flags (what could go wrong)

**Why it's the first skill:** Vibe coders start with a vague idea. If we solve the "from idea to buildable spec" problem first, every subsequent Vibemate skill becomes more valuable because the codebase is already well-structured.

---

#### Skill 2 — Enterprise Readiness Auditor (FREE tier: summary only, PAID: full report)
**Trigger:** `/vibemate audit`
**Input:** Scans the current project repository
**Output:**
- Severity-ranked checklist of missing enterprise patterns
- Categories: Security, Reliability, Scalability, Observability, Developer Experience
- Each issue: what's missing, why it matters, how to fix it
- One-click "fix this" that applies the fix via Vibemate scaffold

**Example output:**
```
VIBEMATE AUDIT REPORT

CRITICAL (fix before launch):
  ✗ No rate limiting on /api/auth/login (brute force risk)
  ✗ API keys stored in code, not environment variables
  ✗ No input validation on user-facing forms

HIGH:
  ✗ No error monitoring (Sentry or equivalent)
  ✗ Database has no connection pooling
  ✗ No database migration strategy

MEDIUM:
  ✗ No loading states on async actions
  ✗ Missing robots.txt and sitemap.xml
  ✗ No structured logging
```

---

#### Skill 3 — Auth Scaffolder (FREE basic, PAID enterprise)
**Trigger:** `/vibemate scaffold auth`
**Detects stack automatically, then generates:**
- Signup / Login / Logout flows
- JWT or session-based auth (stack-appropriate)
- Password reset with secure token expiry
- Email verification
- OAuth (Google, GitHub — configurable)
- Rate limiting on auth endpoints
- RBAC (Role-Based Access Control) skeleton
- Database schema + migrations

---

#### Skill 4 — Payments Scaffolder (PAID)
**Trigger:** `/vibemate scaffold payments`
**Generates:**
- Stripe Checkout integration
- Webhook handler (with signature verification)
- Subscription management (upgrade, downgrade, cancel)
- Failed payment handling + retry logic
- Customer portal
- Database schema for plans, subscriptions, invoices
- Environment variable setup guide

---

### Post-MVP Skills (Roadmap)

| Skill | Description | Tier |
|---|---|---|
| CI/CD Scaffolder | GitHub Actions pipelines, test + lint + deploy | Paid |
| Database Scaffolder | Schema design, migrations, connection pooling, indexing | Paid |
| Observability Scaffolder | Sentry, logging, uptime monitoring, dashboards | Paid |
| API Security Scaffolder | CORS, CSP headers, input validation, SQL injection guards | Free |
| Multi-tenancy Scaffolder | Org/workspace model, row-level security | Paid |
| Email Scaffolder | Transactional email with Resend/Postmark + templates | Free basic |
| Deploy Scaffolder | Vercel, Railway, Fly.io config with env management | Free |
| Testing Scaffolder | Unit + integration + E2E test setup with real examples | Paid |

---

## 5. Pillar 5 — SaaS UI Utilities Library

A curated collection of production-ready, enterprise-grade UI building blocks — onboarding flows, auth pages, kanban boards, dashboards, settings pages, billing pages, and more — that vibe coders can install instantly into any project.

### What makes this different from copying from the internet

Every Vibemate UI utility:
- Has **telemetry baked in** (component-level error tracking, render performance, user interaction events)
- Has **feature flags built in** (A/B test any UI variant without touching code)
- Is **auto-scaling aware** (uses patterns that work from 1 user to 1 million)
- Is **headless-first** with a shadcn/ui + Tailwind skin as the default (swap the skin, keep the logic)
- Is **security-audited** before listing (no XSS vectors, no unsafe innerHTML, proper CSRF handling)

---

### Delivery Surfaces (All Three)

#### Surface 1 — MCP Skill (inside AI coding tool)
```
User types: "vibemate add onboarding"

→ Vibemate detects their stack (Next.js App Router, etc.)
→ Generates the full onboarding component, adapted to their project
→ Adds it to the correct file location
→ Updates routing/navigation automatically
→ Wires up telemetry + PostHog feature flags
```

#### Surface 2 — CLI
```bash
npx vibemate-ui add kanban          # adds kanban board
npx vibemate-ui add onboarding      # adds onboarding flow
npx vibemate-ui add auth-pages      # adds all auth pages
npx vibemate-ui list                # browse all available utilities
```

#### Surface 3 — Web Component Picker (vibemate.dev/ui)
- Live preview of every component
- Filter by category, stack, framework
- One-click "Copy code" or "Install via CLI"
- Telemetry preview: shows what data each component tracks

---

### UI Utilities Catalog

#### Category 1 — Authentication & Identity
| Utility | Description | OSS Base |
|---|---|---|
| Login Page | Email/password + OAuth buttons, shadcn styled, error states | shadcn/ui login blocks (MIT) |
| Sign Up Page | Multi-step, email verification, password strength | shadcn/ui + Better Auth UI (MIT) |
| Forgot Password | Token-based reset flow with expiry | Better Auth UI (MIT) |
| Magic Link Page | Passwordless entry, animated states | Custom on Better Auth |
| User Profile | Avatar upload, name, email change, 2FA toggle | saas-ui (MIT core) |
| Team Members | Invite, role management, remove, pending invites | saas-ui patterns |

#### Category 2 — Onboarding
| Utility | Description | OSS Base |
|---|---|---|
| Product Tour | Step-by-step UI walkthrough with tooltips | Shepherd.js (MIT) |
| Onboarding Checklist | Progress bar + tasks (e.g. "Connect your first X") | OnboardJS (MIT) |
| Welcome Flow | Multi-step modal: collect role, use case, team size | Custom headless |
| Feature Announcement | Banner/modal announcing new features | NextStep.js (MIT) |
| Empty State | Context-aware empty state with CTA for each page | Custom on shadcn |

#### Category 3 — Productivity & Core SaaS Patterns
| Utility | Description | OSS Base |
|---|---|---|
| Kanban Board | Full drag-and-drop board: columns, cards, labels | dnd-kit (MIT) + shadcn |
| Data Table | Sortable, filterable, paginated table with row actions | TanStack Table (MIT) + shadcn |
| Command Palette | ⌘K quick search/action menu | cmdk (MIT) + shadcn |
| Notification Center | Bell icon + dropdown with grouped notifications | Custom + shadcn |
| Activity Feed | Timeline of actions/events | Custom on shadcn |
| Settings Page | Sidebar nav + tabbed sections (Profile, Team, Billing, API) | saas-ui patterns |

#### Category 4 — Billing & Subscription
| Utility | Description | OSS Base |
|---|---|---|
| Pricing Page | Feature comparison table + Stripe Checkout CTA | Custom on shadcn |
| Billing Dashboard | Current plan, usage, invoices, upgrade/downgrade | saas-ui + Stripe |
| Upgrade Modal | In-app upsell modal triggered by feature gates | Custom on shadcn |
| Usage Meter | Visual progress bar showing plan limits | Custom on shadcn |

#### Category 5 — Analytics & Monitoring
| Utility | Description | OSS Base |
|---|---|---|
| Analytics Dashboard | Key metric cards + charts | Recharts (MIT) + shadcn |
| Error Boundary | Catches React errors, shows friendly fallback, logs to Sentry | Custom |
| Status Page | Uptime/incident display | Custom on shadcn |

---

### Architecture: Headless Core + Skin System

```
┌────────────────────────────────────────────┐
│   HEADLESS CORE (framework-agnostic)        │
│   State machine, logic, accessibility       │
│   Works with any styling system            │
└────────────────┬───────────────────────────┘
                 │ implements
┌────────────────▼───────────────────────────┐
│   SHADCN/UI SKIN (default)                  │
│   Tailwind CSS 4, Radix primitives          │
│   Can be swapped for any other design sys  │
└────────────────────────────────────────────┘
```

---

## 6. Pillar 6 — Telemetry, Auto-Scale & Evolve Pipeline

This is what separates Vibemate from any other component library: **every piece of infrastructure Vibemate touches is wired into a self-improving feedback loop** — from the user's app all the way back to Vibemate's recommendations engine.

### Layer 1 — Per-Component Telemetry (built into every utility)

Every Vibemate UI utility ships with non-invasive telemetry wired to the user's **own** observability stack:

```typescript
// What gets auto-instrumented into each component:
// • Render time (P50, P95, P99)
// • User interaction events (clicks, form submissions, completions)
// • Error boundaries (caught exceptions + stack traces)
// • Feature flag exposure events
// • Drop-off points (where users abandon a flow)

// All sent to the user's PostHog / OpenTelemetry endpoint
// Zero data goes to Vibemate servers (privacy-first)
```

**Real-world example:** A vibe coder installs the Onboarding Checklist. After a week, their Vibemate dashboard shows: *"68% of users complete Step 1 but only 23% complete Step 3 ('Connect your first integration'). Consider simplifying Step 3."*

---

### Layer 2 — Full-App Observability Scaffolding

`/vibemate scaffold observability` installs a complete observability stack into the user's app:

```
What gets installed:
├── OpenTelemetry SDK (traces + metrics + logs)
├── SigNoz or OpenObserve config (self-hosted, Apache 2.0)
├── Error tracking (Sentry or OpenTelemetry-native)
├── Structured logging setup
├── Performance monitoring (Core Web Vitals)
└── Health check endpoint + uptime monitoring config
```

**OSS stack used:**
| Tool | License | Role |
|---|---|---|
| OpenTelemetry SDK | Apache 2.0 ✅ | Standard instrumentation layer |
| SigNoz | Apache 2.0 ✅ | Full observability platform (traces, logs, metrics) |
| OpenObserve | Apache 2.0 ✅ | Lightweight alternative to Elasticsearch + Grafana |
| PostHog (self-hosted) | MIT ✅ | Product analytics + session replay + feature flags |

---

### Layer 3 — Feature Flags + A/B Testing (per component)

Every Vibemate UI utility has built-in feature flag hooks:

```typescript
// Every component accepts a `variant` prop wired to PostHog/GrowthBook
<VibemateKanban
  variant="experiment_compact_cards"  // ← A/B test variant
  onVariantExposed={(flag) => track(flag)}
/>
```

**What this enables:**
- Ship a UI change to 10% of users, measure impact, roll out or roll back
- Test pricing page layouts, onboarding flow copy, CTA button colors
- Auto-promoted to 100% if conversion improves (via GrowthBook)

**OSS stack:**
| Tool | License | Role |
|---|---|---|
| PostHog | MIT ✅ | Feature flags + A/B testing + analytics in one |
| GrowthBook | MIT ✅ | Warehouse-native experimentation + statistical rigor |
| Unleash (self-hosted) | Apache 2.0 ✅ | Enterprise feature flag management |

---

### Layer 4 — Evolve Pipeline (the full feedback loop)

```
┌─────────────────────────────────────────────────────────────────┐
│                    VIBEMATE EVOLVE PIPELINE                     │
│                                                                 │
│  User's App                                                     │
│  ├── Component renders → telemetry events fire                  │
│  ├── Feature flag experiments run → conversion data captured    │
│  └── Errors, drop-offs, slow renders → alerts triggered        │
│                    │                                            │
│                    ▼  (anonymized, aggregated)                  │
│  Vibemate Platform Analytics                                    │
│  ├── Which components have high drop-off rates across users?    │
│  ├── Which A/B variants win most often by use case?             │
│  └── Which scaffolded patterns generate the most support asks? │
│                    │                                            │
│                    ▼                                            │
│  AI Evolve Engine (Claude API)                                  │
│  ├── Detects patterns: "Onboarding Step 3 fails 70% of apps"   │
│  ├── Proposes improved component variant                        │
│  ├── Ships as new A/B test to opted-in users                    │
│  └── Winning variant becomes the new default in registry        │
│                    │                                            │
│                    ▼                                            │
│  User Notification (in their coding tool via MCP)              │
│  "Vibemate updated your Onboarding Checklist: Step 3           │
│   redesign is available. 47% completion lift in beta.           │
│   Run: vibemate update onboarding-checklist"                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Auto-Scale Architecture

Every component and skill Vibemate generates follows auto-scaling principles by default:

| Concern | Pattern Used | Why |
|---|---|---|
| **Frontend** | Vercel Edge / Cloudflare Pages | Serverless, global CDN, scales to zero |
| **API** | Stateless handlers + connection pooling (pg-pool) | No sticky sessions, horizontal scale |
| **Database** | Postgres with read replicas + Row Level Security | Scales reads, secure by default |
| **Background jobs** | Queue-based (BullMQ / Inngest) not inline async | Never blocks the request path |
| **File storage** | S3-compatible (Cloudflare R2 preferred) | Scales infinitely, cheap egress |
| **Real-time** | Ably / Supabase Realtime (not raw WebSocket servers) | Managed scaling, no server state |
| **Caching** | Redis (Upstash serverless) at API + DB layer | Sub-5ms responses at scale |
| **Rate limiting** | Upstash Redis rate limiter on every public endpoint | Prevents abuse at zero infra cost |

**Key principle:** Vibemate never generates code that requires a DevOps engineer to scale. Every pattern it uses scales automatically from 1 to 1,000,000 users without reconfiguration.

---

### Vibemate Platform Analytics (Internal)

Vibemate itself tracks (with user consent, opt-out available):
- Which skills are used most / least per stack type
- Which components have the highest drop-off (in Vibemate's own UI)
- Which scaffolded patterns produce the most audit warnings later
- Time-to-first-value per user cohort

This feeds directly into what gets built next, prioritized, deprecated, or redesigned in Vibemate itself.

---

## 5. Registry / Marketplace

A web-based catalog at **vibemate.dev** (or similar) where:
- Users browse and discover Vibemate skills
- Community can submit skills (reviewed before listing)
- Each skill shows: what it does, which stacks it supports, free vs paid, install command
- One-click install updates their MCP config

**Security-first differentiator:** Every skill is audited for:
- No SSRF vulnerabilities
- No unsafe command execution
- Auth required on all network-exposed tools
- No hardcoded secrets

This directly addresses the gap in current MCP marketplaces (Smithery: 36.7% SSRF, 41% no auth).

---

## 6. Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│                 CODING TOOL (user's)                │
│        Claude Code / Cursor / Codex / etc.          │
└───────────────────┬─────────────────────────────────┘
                    │ MCP Protocol (stdio or SSE)
                    ▼
┌─────────────────────────────────────────────────────┐
│              VIBEMATE MCP SERVER                    │
│  (runs locally via npx OR hosted remote server)     │
│                                                     │
│  Skills:                                            │
│  • spec-generator     • auth-scaffolder             │
│  • audit-agent        • payments-scaffolder         │
│  • [registry of skills loaded dynamically]          │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────────┐
│   Claude API     │   │   Vibemate Cloud API          │
│   (LLM calls)    │   │   • Auth / license check      │
│                  │   │   • Skill registry            │
│                  │   │   • Usage tracking            │
└──────────────────┘   └──────────────────────────────┘
```

---

## 7. OSS Foundation (Commercial-Safe Licenses)

### Core MCP & Scaffolding

| Layer | OSS to Use | License | Why |
|---|---|---|---|
| MCP Server core | `@modelcontextprotocol/sdk` (TypeScript) | Apache 2.0 ✅ | Official SDK, commercial safe |
| Audit agent logic | `pr-agent` (qodo-ai) patterns | Apache 2.0 ✅ | AI code review agent, proven at scale |
| Scaffolding patterns | `create-t3-app` | MIT ✅ | Best-practice Next.js patterns |
| SaaS patterns | `saas-boilerplate` (apptension) | MIT ✅ | Full SaaS with auth + payments |
| CLI tool | Build custom (don't fork Smithery CLI) | AGPL-3.0 ⚠️ | Smithery is copyleft — risky for commercial SaaS |
| Registry API | Build from scratch | N/A | Own it completely |

### UI Utilities

| Layer | OSS to Use | License | Why |
|---|---|---|---|
| Component primitives | Radix UI (headless) | MIT ✅ | Accessible, unstyled, composable |
| Default skin | shadcn/ui + Tailwind CSS 4 | MIT ✅ | Industry standard for SaaS in 2026 |
| Auth pages | Better Auth UI + shadcn blocks | MIT ✅ | Best-in-class auth UI, shadcn-native |
| Auth backend | Better Auth | MIT ✅ | Most flexible modern auth, Next.js-native |
| Onboarding flow | Shepherd.js + OnboardJS patterns | MIT ✅ | Shepherd has 170+ releases, battle-tested |
| Product tour | NextStep.js | MIT ✅ | App Router native, TypeScript |
| Kanban board | dnd-kit + shadcn kanban | MIT ✅ | Modern, accessible DnD, no deprecated deps |
| Data table | TanStack Table v9 | MIT ✅ | Most powerful headless table in React ecosystem |
| Command palette | cmdk | MIT ✅ | Used by Vercel, Linear, shadcn — standard |
| SaaS UI patterns | saas-ui (core/community) | MIT ✅ | Chakra-based SaaS component patterns |
| Charts | Recharts | MIT ✅ | D3-based, React-native, widely used |

### Telemetry & Evolve Pipeline

| Layer | OSS to Use | License | Why |
|---|---|---|---|
| Instrumentation standard | OpenTelemetry SDK | Apache 2.0 ✅ | Vendor-neutral, CNCF standard |
| Observability platform | SigNoz | Apache 2.0 ✅ | OpenTelemetry-native, self-hostable |
| Lightweight alternative | OpenObserve | Apache 2.0 ✅ | Logs + metrics + traces in one binary |
| Product analytics + flags | PostHog (self-hosted) | MIT ✅ | All-in-one: analytics + flags + A/B + replay |
| Experimentation engine | GrowthBook | MIT ✅ | Warehouse-native, statistical rigor |
| Feature flags (enterprise) | Unleash (self-hosted) | Apache 2.0 ✅ | GDPR-ready, no data leaves your infra |
| Error tracking | OpenTelemetry-native | Apache 2.0 ✅ | Keeps stack vendor-neutral |
| Background jobs | Inngest | Apache 2.0 ✅ | Serverless-native event-driven workflows |
| Caching / rate limiting | Upstash Redis SDK | MIT ✅ | Serverless Redis, scales to zero |

**License rule:** Only MIT or Apache 2.0 code in the core product. Anything AGPL/GPL (e.g. Intro.js, Smithery CLI) used as API call only — never forked into our codebase. When in doubt: check the license before forking.

---

## 8. Business Model

### Freemium Tiers

| Tier | Price | Included |
|---|---|---|
| **Free** | $0 | Spec generator, audit summary (top 3 issues), API security scaffolder, deploy scaffolder, 5 UI utilities/month, basic component telemetry |
| **Pro** | ~$19/mo | Full audit report, all auth/payments/CI/CD scaffolders, unlimited UI utilities, full telemetry dashboard, feature flags (up to 5 experiments), evolve suggestions |
| **Team** | ~$49/mo per seat | All Pro + team skill sharing, private skill registry, unlimited A/B experiments, cross-team component analytics, priority support |
| **Enterprise** | Custom | Self-hosted MCP server + observability stack, custom UI utility library, SSO, SLA, white-label option |

### Revenue Levers
- Subscription (primary)
- Usage-based for LLM-heavy skills (audit, spec generation)
- Marketplace revenue share on paid community skills
- Hosted observability stack (managed SigNoz/PostHog for users who don't want to self-host)
- Custom enterprise UI utility library builds

---

## 9. Build Order

### Phase 1 — Foundation (Weeks 1–3)
- [ ] Set up MCP TypeScript SDK-based server project
- [ ] Implement Skill 1: Spec & Architecture Generator
- [ ] Local CLI: `npx vibemate` installs and configures MCP server
- [ ] Auto-detect coding platform and update correct config file (.mcp.json, .cursor/mcp.json, etc.)
- [ ] Test with Claude Code, Cursor, Codex, Kilocode, OpenCode

### Phase 2 — Core Skills (Weeks 4–6)
- [ ] Implement Skill 2: Enterprise Readiness Auditor
- [ ] Implement Skill 3: Auth Scaffolder (stack detection for Next.js, Express, FastAPI, Laravel)
- [ ] Auth: user account system for vibemate.dev

### Phase 3 — UI Utilities MVP (Weeks 7–9)
- [ ] Build headless component core (state + logic layer)
- [ ] shadcn/ui skin on top of headless core
- [ ] First 5 utilities: Login Page, Sign Up Page, Onboarding Checklist, Kanban Board, Settings Page
- [ ] Per-component OpenTelemetry instrumentation
- [ ] MCP skill: `/vibemate add [component]`
- [ ] CLI: `npx vibemate-ui add [component]`

### Phase 4 — Monetization (Weeks 10–12)
- [ ] Implement Skill 4: Payments Scaffolder
- [ ] Stripe integration for Vibemate Pro subscriptions
- [ ] License check: validate user tier in MCP server
- [ ] Web dashboard at vibemate.dev + Component Picker UI (vibemate.dev/ui)

### Phase 5 — Telemetry & Evolve Pipeline (Weeks 13–16)
- [ ] Scaffold observability skill: installs OpenTelemetry + SigNoz into user's app
- [ ] PostHog feature flag integration into every UI utility
- [ ] GrowthBook A/B test wiring
- [ ] Vibemate platform analytics dashboard (internal: which components/skills get used)
- [ ] Evolve engine v1: AI-generated upgrade suggestions based on drop-off telemetry

### Phase 6 — Registry (Weeks 17–20)
- [ ] Public skill + UI utility registry with search
- [ ] Community skill submission + security audit pipeline
- [ ] One-click install from registry into any coding tool
- [ ] Winning A/B variants automatically promoted to registry defaults

---

## 10. Success Metrics

| Metric | Target (3 months) | Target (6 months) |
|---|---|---|
| MCP installs | 500 | 5,000 |
| Daily active users | 50 | 500 |
| Pro conversions | 5% | 8% |
| Supported coding platforms | 5 | 10 |
| Skills in registry | 10 | 50 |
| UI utilities available | 5 | 25 |
| Components with A/B test data | 0 | 10 |
| Avg. evolve suggestions per active user/mo | — | 3 |

---

## 11. Key Risks

| Risk | Mitigation |
|---|---|
| MCP protocol changes break compatibility | Pin to stable SDK version, monitor official changelog |
| Anthropic ships competing features | Focus on being multi-platform and stack-aware |
| Low MCP adoption in non-Anthropic tools | Build SSE/HTTP transport as fallback; also support VS Code extensions |
| AI hallucinations in generated code | All scaffolded code is template-first with LLM filling in variables, not pure generation |
| Security of generated code | Every pattern is manually reviewed before being added as a skill |
| UI utilities go stale / break on framework updates | Versioned release pipeline + automated upgrade tests against each major framework release |
| Telemetry data privacy concerns | All user-app telemetry stays in user's own infra; only anonymized aggregate data comes to Vibemate with explicit opt-in |
| Evolve pipeline recommends wrong changes | Minimum sample size gates (500+ users, 2+ week window) before any evolve suggestion is generated |
| Competing component libraries (shadcn, saas-ui) | Vibemate's moat is the MCP delivery + telemetry + evolve loop, not the components alone |

---

## 12. Full Product Map (All 6 Pillars)

```
VIBEMATE PLATFORM

├── Pillar 1: MCP Server (the plug)
│   └── Connects Vibemate to any AI coding tool

├── Pillar 2: Skills (the brain)
│   ├── Spec & Architecture Generator
│   ├── Enterprise Readiness Auditor
│   ├── Auth Scaffolder
│   ├── Payments Scaffolder
│   ├── CI/CD Scaffolder
│   ├── Observability Scaffolder
│   └── [more skills in registry]

├── Pillar 3: Registry / Marketplace
│   ├── Skill discovery + 1-click install
│   ├── UI Utility picker
│   └── Security-audited, curated listings

├── Pillar 4: UI Utilities Library
│   ├── Auth pages, Onboarding, Kanban, Tables...
│   ├── Headless core + shadcn skin
│   ├── Built-in telemetry per component
│   └── Built-in feature flag hooks

├── Pillar 5: Telemetry Layer
│   ├── Per-component error + performance tracking
│   ├── Full-app OpenTelemetry scaffolding
│   ├── Feature flags + A/B testing (PostHog/GrowthBook)
│   └── Vibemate internal analytics

└── Pillar 6: Evolve Pipeline
    ├── Usage data → AI analysis → improvement suggestions
    ├── A/B results → winning variant promoted in registry
    ├── User notified in their coding tool via MCP
    └── One-command update: vibemate update [component]
```
