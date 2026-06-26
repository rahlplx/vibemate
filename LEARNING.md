# Vibemate — Complete Learning Guide
## Screen-by-Screen: What We're Building, How to Use It, Where to Use It

> **Who this is for:** Anyone building with AI coding tools who wants to understand Vibemate
> completely — every screen, every component, every feature, explained visually.

---

# PART 0 — The Big Picture (Read This First)

## What Vibemate Actually Is

Imagine you're a vibe coder — you use Claude Code, Cursor, or Codex to build apps.
You can ship fast. But your apps are missing things enterprise companies take for granted:
secure auth, proper payments, error monitoring, onboarding flows, A/B testing...

**Vibemate fills that gap.** It gives you:

```
┌─────────────────────────────────────────────────────────────────┐
│                     THE 3 WAYS TO USE VIBEMATE                  │
│                                                                 │
│  1. INSIDE YOUR AI CODING TOOL (MCP)                            │
│     You type: "vibemate add kanban"                             │
│     Vibemate generates + installs enterprise code for you       │
│                                                                 │
│  2. COMMAND LINE (CLI)                                          │
│     npx vibemate-ui add kanban                                  │
│     Installs from your terminal directly                        │
│                                                                 │
│  3. WEB APP (vibemate.dev)                                      │
│     Browse, preview, manage everything visually                 │
└─────────────────────────────────────────────────────────────────┘
```

## The 6 Pillars (What Vibemate Contains)

```
PILLAR 1 → MCP Server       "The plug that connects Vibemate to your coding tool"
PILLAR 2 → Skills           "Commands that generate enterprise code for you"
PILLAR 3 → Registry         "A store of skills and UI components"
PILLAR 4 → UI Utilities     "Ready-made screens: login, onboarding, kanban, etc."
PILLAR 5 → Telemetry        "Auto-tracking: how users use your app, where they drop off"
PILLAR 6 → Evolve Pipeline  "AI learns from usage data and suggests improvements"
```

---

# PART 1 — VIBEMATE.DEV (The Web App)

These are the screens a vibe coder sees when they visit vibemate.dev.

---

## SCREEN 1 — Landing Page (vibemate.dev)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│  vibemate     Skills   UI Library   Pricing   Docs    Sign Up  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         Ship Like an Enterprise Team.                           │
│         Build Like a Vibe Coder.                               │
│                                                                 │
│   The MCP toolkit that gives solo founders and small teams      │
│   the same auth, payments, onboarding, and observability        │
│   patterns that 50-engineer companies take for granted.         │
│                                                                 │
│         [ Get Started Free ]   [ See the UI Library ]          │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  Works with:                                                    │
│  [Claude Code]  [Cursor]  [Codex]  [Kilocode]  [OpenCode]      │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  /vibemate   │  │  /vibemate   │  │  /vibemate   │          │
│  │  spec        │  │  audit       │  │  add kanban  │          │
│  │              │  │              │  │              │          │
│  │ Turns your   │  │ Scans your   │  │ Installs     │          │
│  │ idea into a  │  │ app, lists   │  │ drag-drop    │          │
│  │ full spec +  │  │ what's       │  │ kanban with  │          │
│  │ architecture │  │ missing      │  │ telemetry    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components Used
| Component | What it does |
|---|---|
| **Navbar** | Logo + nav links + Sign Up CTA button |
| **Hero Section** | Big headline, subheadline, two CTA buttons |
| **Logo Bar** | Shows logos of supported AI coding platforms |
| **Feature Cards (3-up)** | Each card shows a Vibemate skill with description |
| **Social Proof Strip** | Stars, user count, testimonial quotes |
| **Footer** | Links, legal, social icons |

### Features on this screen
- **Responsive** — works on mobile, tablet, desktop
- **CTA tracking** — PostHog tracks which CTA gets clicked ("Get Started" vs "See UI Library")
- **Platform detection** — Detects if user came from a Claude Code deeplink (UTM param)

### Specs
- Built with: Next.js App Router + shadcn/ui + Tailwind CSS 4
- Font: Geist (Vercel's typeface — free, modern)
- Animation: Framer Motion for hero text entrance
- Data: Static (no API call needed on landing page)

---

## SCREEN 2 — Sign Up Page (vibemate.dev/signup)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│  vibemate                                                       │
├────────────────────────┬────────────────────────────────────────┤
│                        │                                        │
│   Left Panel           │   Right Panel                          │
│   (Brand + Social      │   (Sign Up Form)                       │
│    Proof)              │                                        │
│                        │   Create your account                  │
│   "Join 5,000+ vibe    │                                        │
│    coders shipping     │   Full name                            │
│    enterprise-grade    │   [ John Doe               ]          │
│    products"           │                                        │
│                        │   Email address                        │
│   ★★★★★ 4.9           │   [ john@example.com        ]          │
│   "Cut my setup time   │                                        │
│    from 3 days to      │   Password                             │
│    30 minutes"         │   [ ••••••••••••           ] 👁        │
│   — Sarah K.           │   ● Strong password                    │
│                        │                                        │
│                        │   [ Continue with Google   ]          │
│                        │   [ Continue with GitHub   ]          │
│                        │                                        │
│                        │   ─── or ───                           │
│                        │                                        │
│                        │   [ Create Account         ]          │
│                        │                                        │
│                        │   Already have an account? Sign in    │
│                        │                                        │
└────────────────────────┴────────────────────────────────────────┘
```

### Components Used
| Component | What it does | OSS Source |
|---|---|---|
| **Split Layout** | Two-column: brand left, form right | shadcn/ui block `login-02` |
| **Input** | Text field with label and error state | shadcn/ui `<Input>` |
| **Password Input** | With show/hide toggle and strength indicator | Better Auth UI |
| **OAuth Buttons** | Google + GitHub one-click sign in | Better Auth UI |
| **Divider** | "or" separator between OAuth and email form | shadcn/ui `<Separator>` |
| **Primary Button** | "Create Account" CTA | shadcn/ui `<Button variant="default">` |
| **Link** | "Already have an account?" | Next.js `<Link>` |
| **Toast** | Success/error notification after submit | shadcn/ui `<Sonner>` |

### Features on this screen
- **Password strength meter** — real-time visual feedback (weak / medium / strong)
- **OAuth** — Google + GitHub one-click signup (zero friction)
- **Email verification** — after signup, a verification email is sent automatically
- **Error states** — inline field-level errors ("Email already in use")
- **Loading state** — button shows spinner while request is in-flight
- **Auto-redirect** — after success, goes to Dashboard

### Specs
- Auth: Better Auth (MIT) — handles sessions, OAuth tokens, email verification
- Database: Postgres with `users` table + `sessions` table
- Email: Resend (transactional) for verification email
- Validation: Zod schema on both client and server
- Rate limiting: 5 signup attempts per IP per hour (Upstash Redis)

---

## SCREEN 3 — Sign In Page (vibemate.dev/login)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                       vibemate                                  │
│                                                                 │
│              Welcome back                                       │
│              Sign in to your account                            │
│                                                                 │
│         [ Continue with Google              ]                  │
│         [ Continue with GitHub              ]                  │
│                                                                 │
│                    ─── or ───                                   │
│                                                                 │
│         Email                                                   │
│         [ john@example.com                  ]                  │
│                                                                 │
│         Password                                                │
│         [ ••••••••••••                      ]   Forgot?        │
│                                                                 │
│         [ Sign In                           ]                  │
│                                                                 │
│         Don't have an account? Sign up for free               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components Used
| Component | What it does | OSS Source |
|---|---|---|
| **Center Card Layout** | Single column, centered on page | shadcn/ui block `login-01` |
| **OAuth Buttons** | Google + GitHub buttons with icons | Better Auth UI |
| **Input** | Email + Password fields | shadcn/ui |
| **Forgot Password Link** | Inline right-aligned link | Next.js Link |
| **Submit Button** | Full-width, with loading spinner | shadcn/ui Button |
| **Error Alert** | "Invalid credentials" banner | shadcn/ui Alert |

### Features
- **Remember me** (optional checkbox) — extends session to 30 days
- **Magic link option** (behind feature flag in Pro) — passwordless email sign in
- **Suspicious login detection** — flags login from new device/country (Better Auth built-in)
- **"Forgot password"** — triggers email flow without leaving the page (modal)

### Specs
- Session: Better Auth secure HttpOnly cookies (not localStorage — XSS protection)
- Failed login: Locked after 10 attempts per 15 min (Upstash rate limiter)
- Redirect: After login, goes to `/dashboard` (or the URL they tried to access)

---

## SCREEN 4 — Main Dashboard (vibemate.dev/dashboard)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│  vibemate   Dashboard  Skills  UI Library  Settings        👤  │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│ SIDEBAR  │  Good morning, Sarah 👋                              │
│          │                                                      │
│ Dashboard│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│ Skills   │  │ MCP Status  │ │ Skills Used │ │ Components  │   │
│ UI Lib   │  │ ✓ Connected │ │ 12 this mo  │ │ 8 installed │   │
│ Evolve   │  │ Claude Code │ │ ↑ 40%       │ │ 3 pending   │   │
│ Settings │  └─────────────┘ └─────────────┘ └─────────────┘   │
│          │                                                      │
│ FREE     │  ─── Quick Actions ───────────────────────────────  │
│ PLAN     │                                                      │
│ ↑ Upgrade│  [ + Generate Spec ]  [ ⚡ Run Audit ]  [ + Add UI ]│
│          │                                                      │
│          │  ─── Recently Used Skills ────────────────────────  │
│          │                                                      │
│          │  ┌─────────────────────────────────────────────┐    │
│          │  │ 🔐 Auth Scaffolder      Today, 2:34pm  ✓   │    │
│          │  │ 📊 Spec Generator       Yesterday       ✓   │    │
│          │  │ 🔍 Enterprise Audit     Jun 18          ⚠ 5 │    │
│          │  └─────────────────────────────────────────────┘    │
│          │                                                      │
│          │  ─── Evolve Suggestions ──────────────────────────  │
│          │                                                      │
│          │  ┌─────────────────────────────────────────────┐    │
│          │  │ 💡 Your Onboarding Step 3 has 68% drop-off  │    │
│          │  │    New variant available (+47% completion)   │    │
│          │  │    [ View ]  [ Apply Update ]               │    │
│          │  └─────────────────────────────────────────────┘    │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

### Components Used
| Component | What it does | OSS Source |
|---|---|---|
| **Sidebar Nav** | Persistent left navigation with icons + labels | shadcn/ui sidebar |
| **Stat Cards (3-up)** | MCP status, skills used, components installed | shadcn/ui Card |
| **Quick Action Buttons** | Large icon buttons for most-used actions | shadcn/ui Button |
| **Activity List** | Recent skill runs with status badges | shadcn/ui + custom |
| **Evolve Alert Card** | AI suggestion card with action buttons | shadcn/ui Alert |
| **Plan Badge** | Shows current tier (Free/Pro/Team) with upgrade CTA | Custom shadcn Badge |
| **Avatar + Dropdown** | User profile menu in top-right | shadcn/ui DropdownMenu |

### Features
- **MCP connection status** — real-time check if user's MCP server is running and connected
- **Quick actions** — one-click access to most-used Vibemate skills
- **Recent activity** — history of every skill run, with output status
- **Evolve alerts** — AI-generated improvement suggestions based on telemetry from their app
- **Plan upgrade prompt** — contextual upsell when user hits Free tier limits

### Specs
- Data: REST API → `/api/dashboard/summary` returns stat counts, recent activity, evolve alerts
- Real-time: MCP connection status pings every 30s (SWR polling)
- Evolve alerts: Generated async by AI agent, stored in DB, surfaced on load

---

## SCREEN 5 — Skill Registry / Marketplace (vibemate.dev/skills)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│  vibemate   Dashboard  Skills  UI Library  Settings        👤  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Skill Registry                          [ + Submit a Skill ]  │
│  Find and install enterprise skills for your AI coding tool    │
│                                                                 │
│  [ 🔍 Search skills...                        ] [ Filters ▼ ]  │
│                                                                 │
│  [ All ] [ Auth ] [ Payments ] [ CI/CD ] [ Observability ]      │
│  [ Database ] [ Security ] [ UI ] [ Testing ] [ Community ]    │
│                                                                 │
│  ┌────────────────────┐ ┌────────────────────┐                 │
│  │ 🔐 Auth Scaffolder │ │ 💳 Payments        │                 │
│  │ By Vibemate ✓      │ │ By Vibemate ✓      │                 │
│  │                    │ │                    │                 │
│  │ Generates prod-    │ │ Stripe Checkout,   │                 │
│  │ grade auth: JWT,   │ │ webhooks, subs,    │                 │
│  │ OAuth, RBAC,       │ │ customer portal    │                 │
│  │ password reset     │ │                    │                 │
│  │                    │ │                    │                 │
│  │ ★★★★★  2.3k used  │ │ ★★★★½  1.8k used  │                 │
│  │ Stacks: Next, Exp  │ │ Stacks: Next, Exp  │                 │
│  │ FREE  [Install]    │ │ PRO   [Upgrade]    │                 │
│  └────────────────────┘ └────────────────────┘                 │
│                                                                 │
│  ┌────────────────────┐ ┌────────────────────┐                 │
│  │ 🔍 Audit Agent     │ │ 📊 Observability   │                 │
│  │ By Vibemate ✓      │ │ By Vibemate ✓      │                 │
│  │                    │ │                    │                 │
│  │ Scans your entire  │ │ OpenTelemetry +    │                 │
│  │ repo, severity-    │ │ SigNoz + Sentry    │                 │
│  │ ranked audit of    │ │ full-stack setup   │                 │
│  │ what's missing     │ │ in one command     │                 │
│  │                    │ │                    │                 │
│  │ ★★★★★  3.1k used  │ │ ★★★★★  980 used   │                 │
│  │ All stacks         │ │ All stacks         │                 │
│  │ FREE (summary)     │ │ PRO   [Upgrade]    │                 │
│  └────────────────────┘ └────────────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components Used
| Component | What it does | OSS Source |
|---|---|---|
| **Search Input** | Full-text search across all skills | shadcn/ui Input + server-side search |
| **Filter Dropdown** | Multi-select: stack, category, price tier | shadcn/ui DropdownMenu |
| **Category Pills** | Horizontal scrollable filter tabs | shadcn/ui Badge / tabs |
| **Skill Card** | Shows skill name, author, description, stars, usage count, tier badge, install button | Custom on shadcn Card |
| **Verified Badge** | "✓" on official Vibemate skills | Custom badge |
| **Star Rating** | Visual rating display | Custom component |
| **Install Button** | "Install" (Free) or "Upgrade" (Pro) CTA | shadcn/ui Button |

### Features
- **Full-text search** — searches name, description, tags
- **Category filters** — Auth, Payments, CI/CD, etc.
- **Stack filter** — show only skills compatible with Next.js / Express / FastAPI etc.
- **Tier filter** — Free only, or All
- **Sort** — Most used, Newest, Highest rated
- **Security badge** — all official Vibemate skills show audit status
- **One-click install** — opens install modal with auto-detected platform config

### Specs
- API: `GET /api/skills?q=auth&category=auth&stack=nextjs&tier=free`
- Data: Skills stored in Postgres, indexed with full-text search (tsvector)
- Install: When user clicks install, MCP server config is updated via API + user's local CLI syncs

---

## SCREEN 6 — Skill Detail Page (vibemate.dev/skills/auth-scaffolder)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Registry                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔐 Auth Scaffolder              FREE   ★★★★★ (487 reviews)   │
│  By Vibemate  ✓ Security Audited   2,341 installs             │
│                                                                 │
│  [ Install Now ]   [ View Source ]   [ Report Issue ]          │
│                                                                 │
│  ────────────────────────────────────────────────────────────  │
│                                                                 │
│  [Overview]  [What Gets Generated]  [Stacks]  [Reviews]        │
│                                                                 │
│  OVERVIEW                                                       │
│  Generates production-grade authentication for your SaaS.      │
│  Detects your stack automatically and adapts the output.       │
│                                                                 │
│  WHAT GETS GENERATED                                            │
│  ✓ Login / signup / logout API routes                          │
│  ✓ JWT tokens with refresh token rotation                      │
│  ✓ OAuth: Google + GitHub (configurable)                       │
│  ✓ Password reset with secure expiring token                   │
│  ✓ Email verification flow                                      │
│  ✓ RBAC skeleton (admin / member / viewer roles)               │
│  ✓ Rate limiting on auth endpoints                             │
│  ✓ Database schema + migration files                           │
│                                                                 │
│  HOW TO USE                                                     │
│  In your AI coding tool:                                        │
│  > vibemate scaffold auth                                       │
│                                                                 │
│  SUPPORTED STACKS                                               │
│  [Next.js] [Express] [FastAPI] [Laravel] [Nuxt]               │
│                                                                 │
│  SECURITY AUDIT STATUS                                          │
│  Last audited: Jun 15, 2026 — PASSED                           │
│  ✓ No hardcoded secrets   ✓ Input validation   ✓ CSRF safe    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components Used
| Component | What it does |
|---|---|
| **Breadcrumb** | "← Back to Registry" navigation |
| **Tab Navigation** | Overview / What Gets Generated / Stacks / Reviews |
| **Checklist** | Visual list of everything that gets generated |
| **Code Block** | Shows the command to use the skill |
| **Stack Badge Pills** | Shows which frameworks are supported |
| **Security Audit Badge** | Pass/fail + date of last audit |
| **Review Stars** | Aggregate rating + review count |
| **Install CTA Button** | Sticky at top — always visible |

---

## SCREEN 7 — UI Component Picker (vibemate.dev/ui)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│  vibemate   Dashboard  Skills  UI Library  Settings        👤  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  UI Library                                                     │
│  Ready-to-use components with telemetry built in               │
│                                                                 │
│  [ 🔍 Search components...              ] [Stack: Next.js ▼]   │
│                                                                 │
│  ┌──────┐                                                       │
│  │ All  │ Auth  Onboarding  Productivity  Billing  Analytics   │
│  └──────┘                                                       │
│                                                                 │
│  ┌────────────────────────────────┐  ┌─────────────────────┐   │
│  │                                │  │  COMPONENT PREVIEW  │   │
│  │  🔐 Login Page                 │  │                     │   │
│  │  ─────────────────────────     │  │  [Live preview of   │   │
│  │  [Login Page Preview Thumb]    │  │   selected comp     │   │
│  │                                │  │   renders here      │   │
│  │  shadcn/ui + Better Auth       │  │   in an iframe]     │   │
│  │  ✓ Telemetry  ✓ Feature flags  │  │                     │   │
│  │  FREE                          │  │                     │   │
│  │  [Preview] [Install]           │  │  ─── Details ────   │   │
│  ├────────────────────────────────┤  │                     │   │
│  │  🚀 Onboarding Checklist       │  │  Components used:   │   │
│  │  ─────────────────────────     │  │  • Card             │   │
│  │  [Checklist Preview Thumb]     │  │  • Progress         │   │
│  │                                │  │  • Checkbox         │   │
│  │  OnboardJS + shadcn/ui         │  │  • Button           │   │
│  │  ✓ Telemetry  ✓ Feature flags  │  │                     │   │
│  │  FREE                          │  │  Telemetry events:  │   │
│  │  [Preview] [Install]           │  │  • step_completed   │   │
│  ├────────────────────────────────┤  │  • flow_abandoned   │   │
│  │  📋 Kanban Board               │  │  • checklist_done   │   │
│  │  ─────────────────────────     │  │                     │   │
│  │  [Kanban Preview Thumb]        │  │  [ Install via MCP ]│   │
│  │                                │  │  [ npx CLI command ]│   │
│  │  dnd-kit + shadcn/ui           │  │  [ Copy code ]      │   │
│  │  ✓ Telemetry  ✓ Feature flags  │  │                     │   │
│  │  PRO                           │  └─────────────────────┘   │
│  │  [Preview] [Upgrade]           │                            │
│  └────────────────────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components Used
| Component | What it does |
|---|---|
| **Search Input** | Filter components by name or feature |
| **Stack Selector** | Dropdown: Next.js / Express / Nuxt / SvelteKit |
| **Category Tabs** | Filter: All, Auth, Onboarding, Productivity, Billing, Analytics |
| **Component Card** | Thumbnail, name, description, tier badge, install button |
| **Live Preview Pane** | Right panel — renders selected component in an iframe |
| **Detail Panel** | Shows components used, telemetry events tracked, install options |
| **Install Options** | Three buttons: Install via MCP, CLI command, Copy code |

### Features
- **Live preview** — click any component to see it rendered in real-time (right panel)
- **Stack-aware** — selecting "FastAPI" hides components that are React-only
- **Telemetry transparency** — shows exactly what events each component tracks
- **Three install paths** — MCP (inside coding tool), CLI (terminal), Copy (manual)

---

## SCREEN 8 — Telemetry Dashboard (vibemate.dev/dashboard/telemetry)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│  vibemate  Dashboard  Skills  UI Library  [Telemetry] Settings │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Telemetry Dashboard         [ Last 7 days ▼ ]  [ Export ]    │
│  How your users are experiencing your app                      │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────┐ │
│  │ Onboarding   │ │ Login Page   │ │ Kanban Board │ │ + Add │ │
│  │ Completion   │ │ Bounce Rate  │ │ Cards Moved  │ │  App  │ │
│  │   31.4%      │ │   12.3%      │ │   4.2/day    │ │       │ │
│  │  ↓ was 28%   │ │  ↑ good      │ │  ↑ was 3.1   │ │       │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └───────┘ │
│                                                                 │
│  ─── Onboarding Flow — Step-by-Step Completion ─────────────   │
│                                                                 │
│  Step 1: Welcome          ████████████████████  98%           │
│  Step 2: Profile setup    ████████████████       82%           │
│  Step 3: First action     ████████               41%  ⚠ LOW   │
│  Step 4: Invite team      ████                   22%  ⚠ LOW   │
│  Completed                ███                    18%           │
│                                                                 │
│  ─── Component Performance ──────────────────────────────────  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Component           P50      P95      P99     Errors     │  │
│  │ LoginPage           42ms     87ms     210ms   0.1%       │  │
│  │ OnboardingChecklist 23ms     54ms     98ms    0.0%       │  │
│  │ KanbanBoard         68ms     190ms    420ms ⚠ 0.4%      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ─── Active Experiments ──────────────────────────────────────  │
│                                                                 │
│  Onboarding Step 3 Redesign     Running    Day 5 of 14        │
│  Control: 41% completion    →   Variant A: 58% completion ✓   │
│  [ View Full Results ]                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components Used
| Component | What it does | OSS Source |
|---|---|---|
| **Stat Cards** | Top-level KPI cards with trend arrows | shadcn/ui Card + Recharts |
| **Funnel/Progress Bars** | Onboarding step-by-step completion visualization | Recharts BarChart |
| **Performance Table** | Component render times P50/P95/P99 + error rate | shadcn/ui Table |
| **Experiment Card** | Shows A/B test running, control vs variant completion | Custom |
| **Date Range Picker** | Filter data by time window | shadcn/ui DatePicker |
| **Warning Badge** | "⚠ LOW" flag on underperforming steps | shadcn/ui Badge variant="warning" |

### Features
- **Funnel visualization** — see exactly where users drop off in any flow
- **Component performance** — per-component render time percentiles (P50/P95/P99)
- **Error tracking** — which components are throwing errors and how often
- **Live experiment tracking** — see A/B test results update in real-time
- **Export** — CSV/JSON export of any metric set

### Data Sources
- OpenTelemetry collector running in user's app → SigNoz → Vibemate Dashboard API
- PostHog feature flag events → Vibemate aggregates and displays

---

## SCREEN 9 — Evolve Pipeline Dashboard (vibemate.dev/dashboard/evolve)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│  vibemate   ...   Telemetry   [Evolve]   Settings         👤   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Evolve Pipeline                                                │
│  AI-generated improvements based on your usage data            │
│                                                                 │
│  ─── Pending Suggestions ────────────────────────────────────  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  💡 SUGGESTION 1 of 3              Confidence: HIGH      │  │
│  │  ──────────────────────────────────────────────────────  │  │
│  │  Component: Onboarding Checklist — Step 3               │  │
│  │                                                          │  │
│  │  Problem: Step 3 ("Connect your first integration")      │  │
│  │  has a 59% drop-off rate across 847 users this week.    │  │
│  │                                                          │  │
│  │  Why: The step asks users to set up an API key before   │  │
│  │  they understand the value. Friction is too early.       │  │
│  │                                                          │  │
│  │  Proposed change: Move the integration step to Step 5.  │  │
│  │  Add a "Skip for now" option on Step 3.                  │  │
│  │  Estimated impact: +35-50% completion rate               │  │
│  │  (based on 12 similar apps in Vibemate network)         │  │
│  │                                                          │  │
│  │  [ Apply & Run A/B Test ]  [ Apply Directly ]  [ Skip ] │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ─── Applied Suggestions (History) ──────────────────────────  │
│                                                                 │
│  ✓ Login Page CTA copy change   → +22% signup   Jun 10       │
│  ✓ Kanban "Add Card" position   → +18% usage    Jun 3        │
│  ✗ Pricing page layout A test   → No sig diff   May 28       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components Used
| Component | What it does |
|---|---|
| **Suggestion Card** | Large card with problem description, data evidence, proposed change, impact estimate |
| **Confidence Badge** | HIGH / MEDIUM / LOW based on sample size and statistical significance |
| **Action Buttons** | Three options: A/B Test, Apply Directly, Skip |
| **History Table** | Past suggestions with outcome (↑ improvement, ✗ no effect) |

### Features
- **Evidence-backed suggestions** — every suggestion includes the data behind it
- **Network intelligence** — Vibemate anonymously aggregates patterns across all apps using the same components
- **Safe apply** — "Apply & Run A/B Test" is always the default to avoid breaking production
- **History** — tracks every suggestion applied and its measured impact

---

## SCREEN 10 — Settings & Account (vibemate.dev/settings)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│  vibemate   Dashboard  Skills  UI Library  [Settings]      👤  │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  Settings    │  Profile                                         │
│  ──────────  │                                                  │
│  Profile     │  ┌──────────────────────────────────────────┐   │
│  Account     │  │  [Avatar] Sarah Kim                      │   │
│  Team        │  │          sarah@example.com               │   │
│  Billing     │  │          [ Change Photo ]                │   │
│  API Keys    │  └──────────────────────────────────────────┘   │
│  MCP Config  │                                                  │
│  Telemetry   │  Full name    [ Sarah Kim              ]        │
│  Danger Zone │  Email        [ sarah@example.com      ]        │
│              │  Timezone     [ UTC+0 (London)     ▼  ]        │
│              │                                                  │
│              │  [ Save Changes ]                               │
│              │                                                  │
│              │  ─── Connected Accounts ──────────────────────  │
│              │                                                  │
│              │  Google     sarah@gmail.com      [Disconnect]   │
│              │  GitHub     @sarah-k             [Disconnect]   │
│              │                                                  │
│              │  ─── Password ─────────────────────────────── │
│              │                                                  │
│              │  [ Change Password ]                            │
│              │                                                  │
│              │  ─── Two-Factor Auth ──────────────────────── │
│              │                                                  │
│              │  2FA is OFF          [ Enable 2FA ]            │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

### Sub-pages in Settings

| Sub-page | What's there |
|---|---|
| **Profile** | Name, email, avatar, timezone, connected OAuth accounts, password change, 2FA |
| **Team** | Invite members by email, assign roles (Admin/Member/Viewer), remove members |
| **Billing** | Current plan, next billing date, usage this month, upgrade/downgrade, invoices |
| **API Keys** | Generate, view, revoke API keys for programmatic access to Vibemate |
| **MCP Config** | Shows the exact JSON config to add to each coding tool (copy button) |
| **Telemetry** | Toggle: what data Vibemate collects from their app (opt-out available) |
| **Danger Zone** | Delete account, export all data (GDPR compliance) |

---

## SCREEN 11 — Billing Page (vibemate.dev/settings/billing)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings → Billing                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current Plan: FREE                                             │
│                                                                 │
│  ┌────────────────┐ ┌────────────────┐ ┌───────────────────┐   │
│  │   FREE         │ │   PRO  ← YOU  │ │   TEAM            │   │
│  │   $0/mo        │ │   $19/mo       │ │   $49/seat/mo     │   │
│  │                │ │                │ │                   │   │
│  │ ✓ Spec gen     │ │ ✓ Everything   │ │ ✓ Everything Pro  │   │
│  │ ✓ Audit (top3) │ │   in Free      │ │ ✓ Team sharing    │   │
│  │ ✓ 5 UI comps   │ │ ✓ Full audit   │ │ ✓ Private registry│   │
│  │                │ │ ✓ All scaff.   │ │ ✓ Unlimited A/B   │   │
│  │                │ │ ✓ Unlimited UI │ │                   │   │
│  │                │ │ ✓ 5 A/B tests  │ │                   │   │
│  │  [Current]     │ │ [Upgrade $19]  │ │ [Contact Sales]   │   │
│  └────────────────┘ └────────────────┘ └───────────────────┘   │
│                                                                 │
│  ─── Usage This Month ────────────────────────────────────── │
│                                                                 │
│  Skill runs        ██████████████░░░░░░   14 / 20 (Free limit)│
│  UI components     ███░░░░░░░░░░░░░░░░░    3 / 5  (Free limit)│
│  Audit reports     ██░░░░░░░░░░░░░░░░░░    2 / 3  (Free limit)│
│                                                                 │
│  ─── Invoices ──────────────────────────────────────────────  │
│  No invoices yet (Free plan)                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components Used
| Component | What it does |
|---|---|
| **Pricing Cards (3-up)** | Free / Pro / Team with feature lists and CTA |
| **Usage Progress Bars** | Visual meter showing Free tier limits |
| **Invoice Table** | Past invoices with download button |
| **Stripe Checkout** | Opens when user clicks Upgrade (Stripe-hosted page) |

---

# PART 2 — INSIDE THE AI CODING TOOL (The MCP Experience)

These are the screens/interactions that happen inside Claude Code, Cursor, Codex, etc.

---

## SCREEN 12 — First-Time MCP Setup (one-time, 2 minutes)

### What a vibe coder does

**Step 1: Install Vibemate** (in terminal)
```bash
npx vibemate install
```

**Step 2: What happens automatically**
```
Vibemate Installer
─────────────────────────────────────────
✓ Detected: Claude Code
✓ Detected: Cursor

Adding Vibemate MCP to Claude Code...
  → Updated: ~/.claude/mcp.json

Adding Vibemate MCP to Cursor...
  → Updated: ~/.cursor/mcp.json

Sign in to connect your account:
  → Opening: vibemate.dev/auth/cli-login
  → Token received and saved ✓

✓ Setup complete! Restart your coding tool.

Try it: /vibemate spec "my app idea here"
─────────────────────────────────────────
```

### What gets added to their coding tool config
```json
// .mcp.json (Claude Code)
{
  "mcpServers": {
    "vibemate": {
      "command": "npx",
      "args": ["vibemate-mcp"],
      "env": {
        "VIBEMATE_TOKEN": "vm_live_xxxx"
      }
    }
  }
}
```

### What the vibe coder sees after restart
```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Code                                                    │
│                                                                 │
│  Vibemate MCP connected ✓                                       │
│  Available skills:                                              │
│  • vibemate_spec          Generate a full product spec          │
│  • vibemate_audit         Audit your codebase                   │
│  • vibemate_scaffold      Add enterprise patterns               │
│  • vibemate_add           Add a UI utility component            │
│  • vibemate_update        Update installed components           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## SCREEN 13 — Spec Generator (inside coding tool)

### Input (what the vibe coder types)

```
User: I want to build a tool where freelancers can track their
      time, send invoices, and get paid. It should work on mobile.
      Target customers are solo consultants who hate spreadsheets.

      vibemate spec
```

### Output (what Vibemate generates)

```
VIBEMATE — SPEC & ARCHITECTURE
Generated: Jun 22, 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRODUCT: FreelanceFlow
One-liner: Time tracking + invoicing + payments for solo consultants

━━━ USER PERSONAS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Primary: Solo Consultant (non-technical, 5-20 active clients)
  Goals: Track hours, get paid fast, look professional
  Frustrations: Chasing payments, losing track of hours

━━━ CORE USER FLOWS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Sign up → Create first client → Start time tracking
2. End session → Review hours → Generate invoice → Send invoice
3. Client receives invoice → Pays online → Consultant notified

━━━ DATA MODEL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User { id, email, name, timezone, stripeAccountId }
Client { id, userId, name, email, hourlyRate, currency }
TimeEntry { id, clientId, startTime, endTime, notes, invoiceId }
Invoice { id, clientId, status, totalAmount, dueDate, paidAt }
Payment { id, invoiceId, stripePaymentIntentId, amount, paidAt }

━━━ TECH STACK RECOMMENDATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend:  Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui
Backend:   Next.js API Routes (serverless, auto-scales)
Database:  Postgres (Neon serverless) + Drizzle ORM
Auth:      Better Auth (email + Google OAuth)
Payments:  Stripe Connect (for taking payment + payouts)
Email:     Resend
Deploy:    Vercel (frontend + API) + Neon (database)

Reasoning: All serverless. No DevOps needed. Free tier covers
first 500 users. Upgrade path is simple (just pay more).

━━━ FILE STRUCTURE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app/
├── (auth)/login/page.tsx
├── (auth)/signup/page.tsx
├── dashboard/
│   ├── clients/page.tsx
│   ├── time/page.tsx
│   ├── invoices/page.tsx
│   └── settings/page.tsx
├── api/
│   ├── auth/[...better-auth]/route.ts
│   ├── clients/route.ts
│   ├── time-entries/route.ts
│   ├── invoices/route.ts
│   └── webhooks/stripe/route.ts
lib/
├── db/schema.ts
├── auth.ts
└── stripe.ts

━━━ MILESTONES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Week 1: Auth + client management + basic time tracking
Week 2: Invoice generation + PDF export + email sending
Week 3: Stripe Connect integration + payment flow
Week 4: Mobile polish + onboarding flow + launch

━━━ ENTERPRISE RISKS TO ADDRESS NOW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠ Stripe Connect requires identity verification (takes 2–5 days)
⚠ Invoice PDFs need legal fields (VAT number, address) for EU users
⚠ Time zone handling is critical — store all times as UTC

→ Run: vibemate scaffold auth    (to generate the auth code)
→ Run: vibemate scaffold payments (to generate Stripe Connect)
```

### What happens after the spec
- Vibemate creates `SPEC.md` in the project root
- All recommended Vibemate skills are listed as "next steps"
- Each `vibemate scaffold X` command is clickable/runnable in the coding tool

---

## SCREEN 14 — Enterprise Readiness Audit (inside coding tool)

### Input

```
User: vibemate audit
```

### Output

```
VIBEMATE ENTERPRISE AUDIT
Scanning: /Users/sarah/projects/freelanceflow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files scanned: 47
Time: 8.2 seconds

━━━ CRITICAL — Fix Before Launch ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✗ [SEC-01] No rate limiting on /api/auth/login
  Risk: Brute force attacks can guess passwords
  Fix: Run `vibemate scaffold rate-limiting`

✗ [SEC-02] API keys stored in comments in 2 files
  Files: lib/stripe.ts:4, app/api/webhooks/stripe/route.ts:9
  Fix: Move to .env.local, add to .gitignore

✗ [SEC-03] No input validation on 4 API routes
  Routes: /api/clients POST, /api/invoices POST (+2 more)
  Fix: Add Zod schema validation (examples provided below)

━━━ HIGH — Fix Before First Paying Customer ━━━━━━━━━━━━━━━━━━━━━

⚠ [REL-01] No error monitoring configured
  Risk: You won't know when things break in production
  Fix: Run `vibemate scaffold observability`

⚠ [REL-02] Database has no connection pooling
  Risk: App will crash under load (>10 concurrent users)
  Fix: Add pg-pool config (1 line change shown below)

⚠ [SCALE-01] Sending emails inline in API route
  Risk: Slow API responses, timeouts under load
  Fix: Move email sending to a background queue

━━━ MEDIUM — Fix in Week 2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

○ No loading skeletons on data-fetching pages
○ No empty states when clients list is empty
○ Missing robots.txt and sitemap.xml
○ No structured logging (console.log only)
○ No health check endpoint

━━━ SUMMARY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3 CRITICAL   4 HIGH   5 MEDIUM

Enterprise Score: 31 / 100

→ Run: vibemate scaffold security    (fixes SEC-01, SEC-03)
→ Run: vibemate scaffold observability (fixes REL-01)
```

---

## SCREEN 15 — Component Installation (inside coding tool)

### Input

```
User: vibemate add kanban
```

### Output

```
VIBEMATE — Installing Kanban Board
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detected stack: Next.js 16, App Router, TypeScript, Tailwind CSS 4

Installing dependencies...
  ✓ @dnd-kit/core
  ✓ @dnd-kit/sortable
  ✓ @dnd-kit/utilities

Creating files...
  ✓ components/kanban/KanbanBoard.tsx
  ✓ components/kanban/KanbanColumn.tsx
  ✓ components/kanban/KanbanCard.tsx
  ✓ components/kanban/types.ts
  ✓ lib/kanban-analytics.ts        ← telemetry hooks

Wiring telemetry...
  ✓ Connected to: PostHog (detected in your project)
  ✓ Events tracked:
      card_moved (from, to, cardId)
      column_created (columnId, name)
      card_created (columnId, cardId)

Feature flag hook ready:
  ✓ Variant key: 'kanban_layout'
  ✓ Add to PostHog to A/B test compact vs expanded cards

Usage:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { KanbanBoard } from '@/components/kanban/KanbanBoard'

<KanbanBoard
  columns={columns}
  onCardMove={(cardId, fromCol, toCol) => updateCard(cardId, toCol)}
/>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Done in 4.2 seconds
```

---

# PART 3 — UI UTILITIES (Installed in the Vibe Coder's App)

These are the screens that get installed INTO the vibe coder's SaaS product for their users.

---

## SCREEN 16 — Login Page (installed in user's app)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [App Logo]                                                     │
│                                                                 │
│            Sign in to YourApp                                   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  [ G  Continue with Google                           ]  │  │
│   │  [ ⬡  Continue with GitHub                           ]  │  │
│   │                                                         │  │
│   │                  ── or ──                               │  │
│   │                                                         │  │
│   │  Email                                                  │  │
│   │  [ your@email.com                                    ]  │  │
│   │                                                         │  │
│   │  Password                                    Forgot?   │  │
│   │  [ ••••••••••••                              ]   👁    │  │
│   │                                                         │  │
│   │  [ Sign In                                           ]  │  │
│   │                                                         │  │
│   │  Don't have an account?  Sign up free                  │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components (inside this screen)
| Component | Shadcn Component | Notes |
|---|---|---|
| Logo | `<Image>` | From `/public/logo.svg` |
| Google OAuth Button | `<Button>` + Google icon | Better Auth handles OAuth flow |
| GitHub OAuth Button | `<Button>` + GitHub icon | Better Auth handles OAuth flow |
| Divider | `<Separator>` | "or" separator |
| Email Input | `<Input type="email">` + `<Label>` | With validation |
| Password Input | Custom on `<Input type="password">` | Show/hide toggle + eye icon |
| Forgot Password Link | `<Link>` | Goes to /forgot-password |
| Sign In Button | `<Button variant="default">` | Full width, loading state |
| Sign Up Link | `<Link>` | Goes to /signup |
| Error Toast | `<Sonner>` | "Invalid credentials" |

### States this screen handles
| State | What the user sees |
|---|---|
| **Default** | Empty form, ready to type |
| **Loading** | Button shows spinner, inputs disabled |
| **Error** | Red border on inputs, error message below |
| **Success** | Redirect to /dashboard |
| **Rate limited** | "Too many attempts. Try again in 15 minutes." |

### Telemetry events tracked
```
login_page_viewed
login_method_selected (method: 'email' | 'google' | 'github')
login_attempted
login_succeeded (method, time_to_complete_ms)
login_failed (error_type: 'invalid_credentials' | 'rate_limited')
forgot_password_clicked
```

### Specs
- Rate limit: 10 failed attempts per email per 15 min
- Session: HttpOnly cookie, 7-day expiry (30 days if "remember me")
- Password: bcrypt hash (cost factor 12)

---

## SCREEN 17 — Onboarding Welcome Flow (installed in user's app)

### What it looks like — Step 1 of 4

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Welcome to YourApp! 👋                 │   │
│  │                                                         │   │
│  │  Let's set up your account in 4 quick steps.           │   │
│  │                                                         │   │
│  │  ●──────────────────────────────  Step 1 of 4          │   │
│  │                                                         │   │
│  │  What best describes you?                               │   │
│  │                                                         │   │
│  │  ┌───────────────┐  ┌───────────────┐                  │   │
│  │  │  💼 Solo       │  │  👥 Team Lead  │                  │   │
│  │  │  Freelancer   │  │  / Manager    │                  │   │
│  │  └───────────────┘  └───────────────┘                  │   │
│  │                                                         │   │
│  │  ┌───────────────┐  ┌───────────────┐                  │   │
│  │  │  🏢 Agency    │  │  🚀 Startup   │                  │   │
│  │  │  Owner        │  │  Founder      │                  │   │
│  │  └───────────────┘  └───────────────┘                  │   │
│  │                                                         │   │
│  │                              [ Continue → ]            │   │
│  │                          [ Skip setup ]               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 2 of 4 — Personalize

```
│  ●●─────────────────────────────  Step 2 of 4                 │
│                                                                 │
│  What's your primary goal with YourApp?                        │
│                                                                 │
│  ○ Track time and invoice clients                               │
│  ○ Manage projects and tasks                                    │
│  ○ Both                                                         │
│                                                                 │
│  [ ← Back ]                         [ Continue → ]            │
```

### Step 3 of 4 — First Action (this is where users drop off most)

```
│  ●●●────────────────────────────  Step 3 of 4                 │
│                                                                 │
│  Add your first client                                          │
│                                                                 │
│  Client name    [ Acme Corp              ]                     │
│  Email          [ billing@acme.com       ]                     │
│  Hourly rate    [ $ 150               ]  [USD ▼]              │
│                                                                 │
│  [ ← Back ]   [ Skip for now ]   [ Add Client → ]            │
```

### Step 4 of 4 — Done

```
│  ●●●●───────────────────────────  Step 4 of 4                 │
│                                                                 │
│              🎉 You're all set!                                │
│                                                                 │
│  Here's what you can do next:                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ⏱ Start tracking time for Acme Corp     [Start Timer] │   │
│  │  📄 Create your first invoice              [Create →] │   │
│  │  📱 Get the mobile app                   [Download]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                        [ Go to Dashboard ]                     │
```

### Components (inside this screen)
| Component | Shadcn Component |
|---|---|
| Modal Overlay | `<Dialog>` |
| Progress Bar | `<Progress>` |
| Step Indicator | Custom dots component |
| Option Cards (selector) | Custom on `<Card>` with selected state |
| Radio Group | `<RadioGroup>` |
| Input Fields | `<Input>` + `<Label>` |
| Navigation Buttons | `<Button>` (outline for Back, default for Continue) |
| Skip Link | `<Button variant="ghost">` |
| Completion Action Cards | `<Card>` with inline `<Button>` |

### Telemetry events tracked
```
onboarding_started
onboarding_step_viewed (step: 1|2|3|4)
onboarding_step_completed (step, time_on_step_ms)
onboarding_step_skipped (step)
onboarding_abandoned (step, time_total_ms)
onboarding_completed (time_total_ms, persona_selected)
```

---

## SCREEN 18 — Onboarding Checklist (persistent widget)

### What it looks like (shown in dashboard corner)

```
┌──────────────────────────────────────────────┐
│  🚀 Get started with YourApp      8/10    ✕  │
│  ████████████████████░░░░   80% complete     │
│                                              │
│  ✓ Create your account                       │
│  ✓ Complete your profile                     │
│  ✓ Add your first client                     │
│  ✓ Start your first timer                    │
│  ✓ Send your first invoice                   │
│  ● Connect Stripe to get paid   [ Do this ]  │ ← highlighted
│  ○ Add a second client                       │
│  ○ Invite a team member                      │
│  ○ Download the mobile app                   │
│  ○ Enable two-factor auth                    │
│                                              │
└──────────────────────────────────────────────┘
```

### Components
| Component | What it does |
|---|---|
| **Collapsible Widget** | Can be minimized to just a progress pill |
| **Progress Bar** | Shows % complete |
| **Checklist Items** | ✓ done, ● current, ○ future |
| **Action Button** | "Do this" → takes user to the right place in the app |
| **Close Button** | Hides checklist (but progress is saved) |

### Features
- **Persistent** — remembers state across sessions
- **Smart current item** — always highlights the next most impactful incomplete item
- **Deep links** — "Do this" button navigates to the exact page/modal to complete the task
- **Completion celebration** — confetti animation when hitting 100%

### Telemetry
```
checklist_opened / checklist_minimized
checklist_item_clicked (item_key)
checklist_item_completed (item_key, days_since_signup)
checklist_completed (total_days_to_complete)
```

---

## SCREEN 19 — Kanban Board (installed in user's app)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│  Projects               [ + New Column ]   [ ⚙ Board Settings ]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  TO DO  (3)  │  │ IN PROGRESS  │  │   DONE  (5)  │         │
│  │  ───────     │  │    (2)       │  │  ────────     │         │
│  │              │  │  ─────────── │  │              │         │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │         │
│  │ │ Design   │ │  │ │ Build    │ │  │ ┊ Write    │ │         │
│  │ │ login pg │ │  │ │ API auth │ │  │ ┊ spec doc │ │         │
│  │ │          │ │  │ │          │ │  │ └──────────┘ │         │
│  │ │ 🔵 Sarah │ │  │ │ 🟢 John  │ │  │ ┌──────────┐ │         │
│  │ │ Due Jun24│ │  │ │ Due Jun23│ │  │ ┊ Setup CI │ │         │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │         │
│  │              │  │              │  │              │         │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ + 3 more    │         │
│  │ │ Add DB   │ │  │ │ Deploy   │ │  │              │         │
│  │ │ indexes  │ │  │ │ staging  │ │  │              │         │
│  │ │ 🔴 High  │ │  │ │ 🟡 Med   │ │  │              │         │
│  │ └──────────┘ │  │ └──────────┘ │  │              │         │
│  │              │  │              │  │              │         │
│  │ [ + Add Card]│  │ [ + Add Card]│  │ [ + Add Card]│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components
| Component | What it does | OSS |
|---|---|---|
| **Board Container** | Horizontal scroll wrapper for all columns | Custom |
| **Column** | Droppable area with title, count, cards | dnd-kit droppable |
| **Card** | Draggable item with title, assignee, due date, priority | dnd-kit draggable |
| **Card Detail Modal** | Click a card to open full editing modal | shadcn/ui Dialog |
| **Add Card Button** | Inline text input at bottom of each column | shadcn/ui |
| **New Column Button** | Adds a new column to the board | shadcn/ui |
| **Priority Badge** | 🔴 High / 🟡 Med / 🟢 Low color coding | shadcn/ui Badge |
| **Avatar** | Assignee user photo | shadcn/ui Avatar |

### Features
- **Drag and drop** — cards move between columns and reorder within columns
- **Keyboard navigation** — fully accessible (Tab to card, Space to grab, Arrow to move)
- **Card detail** — click to expand: description, comments, attachments, due date, assignee
- **Column WIP limits** — optional: warn when a column has too many cards
- **Board filters** — filter by assignee, priority, due date
- **Multi-select** — shift-click to select multiple cards and move them together

### Telemetry
```
card_created (columnId)
card_moved (fromColumnId, toColumnId, cardId)
card_deleted (cardId)
column_created
board_filter_applied (filterType)
card_detail_opened (cardId, time_on_board_ms)
```

---

## SCREEN 20 — Command Palette ⌘K (installed in user's app)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│          ┌───────────────────────────────────────────┐         │
│          │  🔍  Search anything...         ⌘K  ✕    │         │
│          ├───────────────────────────────────────────┤         │
│          │  Recent                                   │         │
│          │  ─────────────────────────────────────── │         │
│          │  📄 Invoice #INV-047 — Acme Corp          │         │
│          │  👤 John Smith (Client)                   │         │
│          │  ⏱ Time Entry — Tuesday 2h 30m            │         │
│          │                                           │         │
│          │  Actions                                  │         │
│          │  ─────────────────────────────────────── │         │
│          │  ➕ New Time Entry              ⌘T        │         │
│          │  📄 New Invoice                 ⌘I        │         │
│          │  👤 Add Client                 ⌘C        │         │
│          │  ⚙  Go to Settings             ⌘,        │         │
│          │                                           │         │
│          └───────────────────────────────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### After typing "inv"

```
│  ┌───────────────────────────────────────────┐                 │
│  │  🔍  inv                         ⌘K  ✕   │                 │
│  ├───────────────────────────────────────────┤                 │
│  │  📄 Invoice #INV-047 — Acme Corp           │                 │
│  │  📄 Invoice #INV-046 — Beta Ltd            │                 │
│  │  📄 Create new invoice              [→]   │                 │
│  └───────────────────────────────────────────┘                 │
```

### Components
| Component | What it does | OSS |
|---|---|---|
| **cmdk** | The core command palette component | `cmdk` (MIT) |
| **Dialog** | Modal overlay that wraps cmdk | shadcn/ui Dialog |
| **Command.Input** | The search field | cmdk built-in |
| **Command.List** | Results container | cmdk built-in |
| **Command.Group** | Section headers (Recent, Actions) | cmdk built-in |
| **Command.Item** | Individual result row | cmdk built-in |
| **Keyboard Shortcut Badge** | Shows ⌘T etc. | Custom Badge |

### Features
- **Opens with ⌘K** (Mac) or **Ctrl+K** (Windows/Linux)
- **Real-time search** — results update as user types (debounced 100ms)
- **Keyboard navigation** — Arrow keys + Enter, no mouse needed
- **Deep search** — searches across clients, invoices, time entries, and actions
- **Recent items** — shows last 5 items viewed when no search query

---

## SCREEN 21 — Settings Page (installed in user's app)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│  YourApp — Settings                                            │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  Profile     │  Profile Settings                               │
│  Team        │                                                  │
│  Billing     │  Full name                                       │
│  API         │  [ Sarah Kim                       ]            │
│  Notifications│                                                  │
│  Security    │  Email                                           │
│  Danger Zone │  [ sarah@example.com               ]            │
│              │                                                  │
│              │  Profile photo                                   │
│              │  ┌──────┐  [ Upload Photo ]  [ Remove ]         │
│              │  │  SK  │                                        │
│              │  └──────┘                                        │
│              │                                                  │
│              │  Timezone                                        │
│              │  [ UTC-5 (Eastern Time)           ▼ ]           │
│              │                                                  │
│              │  Currency                                        │
│              │  [ USD — US Dollar                ▼ ]           │
│              │                                                  │
│              │  [ Save Changes ]                               │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

### Sub-sections in Settings
| Sub-page | Key components and features |
|---|---|
| **Profile** | Avatar upload, name, email, timezone, currency |
| **Team** | Invite by email, role select (Admin/Member/Viewer), pending invites list, remove members |
| **Billing** | Current plan card, usage meters, Stripe Customer Portal link, invoice list |
| **API** | API key list: generate new, copy, revoke. Shows last used date |
| **Notifications** | Toggle: email vs in-app per notification type (invoice paid, new comment, etc.) |
| **Security** | Change password, 2FA toggle (TOTP), active sessions list with revoke |
| **Danger Zone** | Delete account (double-confirm modal), export all data (GDPR) |

---

## SCREEN 22 — Pricing Page (installed in user's app)

### What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              Simple, transparent pricing                        │
│         Start free. Upgrade when you need more.                │
│                                                                 │
│              [ Monthly ]  [Annual — Save 20%]                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐ │
│  │  STARTER     │  │  PRO        ★    │  │  TEAM             │ │
│  │  $0 / mo     │  │  $19 / mo        │  │  $49 / seat / mo  │ │
│  │              │  │                  │  │                   │ │
│  │ For solo     │  │ For growing      │  │ For teams of 5+   │ │
│  │ builders     │  │ businesses       │  │                   │ │
│  │              │  │                  │  │                   │ │
│  │ ✓ 3 clients  │  │ ✓ Unlimited      │  │ ✓ Everything Pro  │ │
│  │ ✓ 5 invoices │  │   clients        │  │ ✓ Team workspace  │ │
│  │ ✓ Time track │  │ ✓ Unlimited inv  │  │ ✓ Role management │ │
│  │              │  │ ✓ Recurring inv  │  │ ✓ Shared clients  │ │
│  │              │  │ ✓ Client portal  │  │ ✓ Analytics       │ │
│  │              │  │ ✓ Priority email │  │ ✓ Priority support│ │
│  │              │  │                  │  │                   │ │
│  │[Get Started] │  │[Start Free Trial]│  │  [ Contact Sales ]│ │
│  └──────────────┘  └──────────────────┘  └───────────────────┘ │
│                                                                 │
│  ─── FAQ ──────────────────────────────────────────────────── │
│  ▼ Can I change plans later?                                   │
│  ▼ What payment methods do you accept?                         │
│  ▼ Is there a free trial?                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components
| Component | What it does | OSS |
|---|---|---|
| **Toggle (Monthly/Annual)** | Switches price display + updates CTA | shadcn/ui Switch |
| **Pricing Card** | Plan name, price, features, CTA button | Custom on shadcn Card |
| **Most Popular Badge** | Highlights the recommended plan | shadcn/ui Badge |
| **Feature Check List** | ✓ lines per plan | shadcn/ui |
| **CTA Buttons** | Different actions per plan tier | shadcn/ui Button |
| **FAQ Accordion** | Expandable questions | shadcn/ui Accordion |

### Features
- **Annual toggle** — shows discounted annual price, updates all CTAs
- **Highlighted plan** — middle plan has "Most Popular" badge and slightly elevated card
- **Usage-based metering** — for teams using Stripe Metered Billing
- **A/B test ready** — feature flag hook on every pricing variant (copy, order, price)

### Telemetry
```
pricing_page_viewed
pricing_plan_hovered (plan: 'starter'|'pro'|'team', duration_ms)
pricing_billing_toggle (to: 'monthly'|'annual')
pricing_cta_clicked (plan, billing_period)
pricing_faq_opened (question_index)
```

---

# PART 4 — HOW EVERYTHING CONNECTS

## The Full Journey of a Vibe Coder (Start to Shipped)

```
DAY 1
─────
Visit vibemate.dev → Sign up free (Screen 2)
Install Vibemate MCP (Screen 12, 30 seconds)
Type: "vibemate spec [my idea]" in Claude Code (Screen 13)
  → Get full spec, architecture, tech stack, milestones
  → Saved as SPEC.md in project

DAY 2-3
───────
Start building based on spec
Type: "vibemate scaffold auth"
  → Production-grade auth generated (Better Auth + JWT + OAuth)
Type: "vibemate add login-page"
  → Login/signup/forgot-password pages installed with telemetry
Type: "vibemate add onboarding-checklist"
  → Onboarding widget installed, tracks step completions

WEEK 2
──────
Type: "vibemate scaffold payments"
  → Stripe Checkout + webhooks + subscription management
Type: "vibemate add pricing-page"
  → Pricing page installed with annual toggle + A/B flag hooks
Type: "vibemate audit"
  → Audit report: 2 critical, 4 high issues → fix them

WEEK 3
──────
Type: "vibemate scaffold observability"
  → OpenTelemetry + SigNoz installed
  → Telemetry dashboard live at vibemate.dev/dashboard/telemetry

WEEK 4 (LAUNCH)
───────────────
App launches
Telemetry starts flowing
Onboarding drop-off detected at Step 3
Evolve suggestion arrives (Screen 9)
Click "Apply & Run A/B Test"
Week 6: Variant wins, Step 3 completion goes from 41% → 68%
Vibemate promotes new default, notifies via MCP

ONGOING
───────
vibemate.dev/dashboard → see evolve suggestions
vibemate update [component] → apply AI-recommended improvements
Browse skill registry → add more enterprise patterns as needed
Upgrade to Pro as usage grows
```

---

## Quick Reference: All MCP Commands

| Command | What it does | Free/Pro |
|---|---|---|
| `vibemate spec [idea]` | Generate full product spec + architecture | Free |
| `vibemate audit` | Audit codebase for enterprise gaps | Free (top 3) |
| `vibemate audit --full` | Full audit with all issues + code fixes | Pro |
| `vibemate scaffold auth` | Generate production-grade auth | Free (basic) |
| `vibemate scaffold payments` | Generate Stripe integration | Pro |
| `vibemate scaffold observability` | Install OpenTelemetry + SigNoz | Pro |
| `vibemate scaffold cicd` | Generate GitHub Actions pipelines | Pro |
| `vibemate add [component]` | Install a UI utility with telemetry | Free (5/mo) |
| `vibemate update [component]` | Apply evolve suggestion to component | Pro |
| `vibemate list` | Browse all available skills + components | Free |
| `vibemate status` | Check MCP connection + plan status | Free |

---

## Quick Reference: All UI Utilities

| Utility | Category | Tier |
|---|---|---|
| Login Page | Auth | Free |
| Sign Up Page | Auth | Free |
| Forgot Password | Auth | Free |
| Magic Link Page | Auth | Pro |
| User Profile | Auth | Free |
| Team Members Manager | Auth | Pro |
| Product Tour | Onboarding | Free |
| Onboarding Checklist | Onboarding | Free |
| Welcome Flow (multi-step modal) | Onboarding | Free |
| Feature Announcement | Onboarding | Pro |
| Empty States | Onboarding | Free |
| Kanban Board | Productivity | Pro |
| Data Table | Productivity | Pro |
| Command Palette ⌘K | Productivity | Pro |
| Notification Center | Productivity | Pro |
| Activity Feed | Productivity | Pro |
| Settings Page (full) | Core SaaS | Pro |
| Pricing Page | Billing | Free |
| Billing Dashboard | Billing | Pro |
| Upgrade Modal | Billing | Pro |
| Usage Meter | Billing | Pro |
| Analytics Dashboard | Analytics | Pro |
| Error Boundary | Analytics | Free |
| Status Page | Analytics | Pro |
