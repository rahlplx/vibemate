export type SuggestionType = 'spec_section' | 'tech_stack' | 'feature' | 'risk_flag';

export interface Suggestion {
  type: SuggestionType;
  label: string;
  description: string;
  confidence: number;
  action: string;
}

export interface SuggestionRequest {
  query: string;
  context?: {
    idea?: string;
    stack?: string;
  };
}

export interface SuggestionResponse {
  suggestions: Suggestion[];
  query: string;
}

export interface AutoComplete {
  suggest(request: SuggestionRequest): Suggestion[];
  getSuggestions(): Suggestion[];
}

const ALL_SUGGESTIONS: Suggestion[] = [
  { type: 'spec_section', label: 'Authentication & Authorization', description: 'User login, signup, password reset, OAuth, role-based access control', confidence: 0.95, action: 'add_section' },
  { type: 'spec_section', label: 'Payment Processing', description: 'Stripe integration, subscription management, invoicing, webhook handling', confidence: 0.93, action: 'add_section' },
  { type: 'spec_section', label: 'Team Collaboration', description: 'Multi-user workspaces, invitations, permissions, activity feeds', confidence: 0.90, action: 'add_section' },
  { type: 'spec_section', label: 'API Design', description: 'RESTful endpoints, request/response schemas, error handling, rate limiting', confidence: 0.88, action: 'add_section' },
  { type: 'spec_section', label: 'Data Model', description: 'Database schema, entity relationships, migrations, indexing strategy', confidence: 0.92, action: 'add_section' },
  { type: 'spec_section', label: 'Real-time Features', description: 'WebSockets, live updates, notifications, event streaming', confidence: 0.85, action: 'add_section' },
  { type: 'spec_section', label: 'File Upload & Storage', description: 'S3-compatible storage, image optimization, file validation, CDN', confidence: 0.87, action: 'add_section' },
  { type: 'spec_section', label: 'Email System', description: 'Transactional emails, templates, send confirmation, digest emails', confidence: 0.86, action: 'add_section' },
  { type: 'spec_section', label: 'Search Functionality', description: 'Full-text search, filters, faceted search, autocomplete', confidence: 0.84, action: 'add_section' },
  { type: 'spec_section', label: 'Analytics & Reporting', description: 'Dashboards, charts, export, scheduled reports, event tracking', confidence: 0.83, action: 'add_section' },
  { type: 'tech_stack', label: 'Next.js + TypeScript', description: 'React framework with SSR, API routes, App Router', confidence: 0.95, action: 'recommend_stack' },
  { type: 'tech_stack', label: 'Express + TypeScript', description: 'Lightweight Node.js backend with middleware ecosystem', confidence: 0.90, action: 'recommend_stack' },
  { type: 'tech_stack', label: 'FastAPI + Python', description: 'Modern Python backend with automatic OpenAPI docs', confidence: 0.88, action: 'recommend_stack' },
  { type: 'tech_stack', label: 'Laravel + PHP', description: 'Full-featured PHP framework with ORM, auth, queues', confidence: 0.85, action: 'recommend_stack' },
  { type: 'tech_stack', label: 'PostgreSQL', description: 'Relational database with JSON support, excellent ecosystem', confidence: 0.94, action: 'recommend_database' },
  { type: 'tech_stack', label: 'Tailwind CSS', description: 'Utility-first CSS framework for rapid UI development', confidence: 0.93, action: 'recommend_frontend' },
  { type: 'tech_stack', label: 'shadcn/ui + Radix', description: 'Component library with accessible, unstyled primitives', confidence: 0.92, action: 'recommend_ui' },
  { type: 'feature', label: 'Dark Mode', description: 'Theme toggle with system preference detection', confidence: 0.80, action: 'add_feature' },
  { type: 'feature', label: 'Responsive Design', description: 'Mobile-first layout that works on all screen sizes', confidence: 0.85, action: 'add_feature' },
  { type: 'feature', label: 'Accessibility (a11y)', description: 'WCAG 2.1 compliance, screen reader support, keyboard navigation', confidence: 0.82, action: 'add_feature' },
  { type: 'feature', label: 'Internationalization (i18n)', description: 'Multi-language support with locale detection and translations', confidence: 0.78, action: 'add_feature' },
  { type: 'feature', label: 'Progressive Web App', description: 'Offline support, service workers, installable on mobile', confidence: 0.75, action: 'add_feature' },
  { type: 'feature', label: 'SEO Optimization', description: 'Meta tags, sitemap, structured data, Open Graph', confidence: 0.81, action: 'add_feature' },
  { type: 'risk_flag', label: 'PCI Compliance Required', description: 'Handling payments means PCI DSS compliance is mandatory', confidence: 0.97, action: 'flag_risk' },
  { type: 'risk_flag', label: 'GDPR Data Protection', description: 'EU user data requires GDPR compliance measures', confidence: 0.95, action: 'flag_risk' },
  { type: 'risk_flag', label: 'SOC 2 Readiness', description: 'Enterprise customers may require SOC 2 certification', confidence: 0.85, action: 'flag_risk' },
  { type: 'risk_flag', label: 'Rate Limiting Needed', description: 'Public API endpoints need rate limiting to prevent abuse', confidence: 0.90, action: 'flag_risk' },
  { type: 'risk_flag', label: 'Database Migration Strategy', description: 'Schema changes need version-controlled migrations', confidence: 0.88, action: 'flag_risk' },
  { type: 'risk_flag', label: 'Error Monitoring', description: 'Production errors need tracking via Sentry or equivalent', confidence: 0.92, action: 'flag_risk' },
];

const KEYWORD_MAP: Record<string, string[]> = {
  auth: ['Authentication & Authorization', 'Dark Mode', 'Internationalization (i18n)'],
  login: ['Authentication & Authorization'],
  signup: ['Authentication & Authorization'],
  payment: ['Payment Processing', 'PCI Compliance Required'],
  stripe: ['Payment Processing', 'PCI Compliance Required'],
  billing: ['Payment Processing'],
  team: ['Team Collaboration'],
  collaborat: ['Team Collaboration'],
  multi: ['Team Collaboration'],
  api: ['API Design', 'Rate Limiting Needed'],
  rest: ['API Design'],
  databas: ['Data Model', 'PostgreSQL', 'Database Migration Strategy'],
  schema: ['Data Model'],
  model: ['Data Model'],
  realtime: ['Real-time Features'],
  websocket: ['Real-time Features'],
  notif: ['Real-time Features'],
  file: ['File Upload & Storage'],
  upload: ['File Upload & Storage'],
  email: ['Email System'],
  mail: ['Email System'],
  search: ['Search Functionality'],
  analytics: ['Analytics & Reporting'],
  report: ['Analytics & Reporting'],
  dashboard: ['Analytics & Reporting'],
  next: ['Next.js + TypeScript'],
  express: ['Express + TypeScript'],
  fastapi: ['FastAPI + Python'],
  laravel: ['Laravel + PHP'],
  python: ['FastAPI + Python'],
  postgres: ['PostgreSQL'],
  sql: ['PostgreSQL'],
  tailwind: ['Tailwind CSS'],
  css: ['Tailwind CSS'],
  ui: ['shadcn/ui + Radix'],
  shadcn: ['shadcn/ui + Radix'],
  todo: ['Authentication & Authorization', 'Data Model', 'API Design', 'Team Collaboration'],
  app: ['Authentication & Authorization', 'API Design', 'Data Model'],
  dark: ['Dark Mode'],
  theme: ['Dark Mode'],
  responsive: ['Responsive Design'],
  mobile: ['Responsive Design'],
  a11y: ['Accessibility (a11y)'],
  accessible: ['Accessibility (a11y)'],
  i18n: ['Internationalization (i18n)'],
  language: ['Internationalization (i18n)'],
  pwa: ['Progressive Web App'],
  offline: ['Progressive Web App'],
  seo: ['SEO Optimization'],
  'gdpr': ['GDPR Data Protection'],
  privacy: ['GDPR Data Protection'],
  'soc 2': ['SOC 2 Readiness'],
  enterprise: ['SOC 2 Readiness'],
  ratelimit: ['Rate Limiting Needed'],
  abuse: ['Rate Limiting Needed'],
  error: ['Error Monitoring'],
  monitoring: ['Error Monitoring'],
  sentry: ['Error Monitoring'],
};

const TRENDING: Suggestion[] = [
  { type: 'spec_section', label: 'Authentication & Authorization', description: 'Essential for any SaaS product', confidence: 0.95, action: 'add_section' },
  { type: 'spec_section', label: 'Payment Processing', description: 'Monetize your product', confidence: 0.93, action: 'add_section' },
  { type: 'tech_stack', label: 'Next.js + TypeScript', description: 'Most popular full-stack framework', confidence: 0.95, action: 'recommend_stack' },
  { type: 'risk_flag', label: 'Error Monitoring', description: 'Catch production issues early', confidence: 0.92, action: 'flag_risk' },
  { type: 'feature', label: 'Responsive Design', description: 'Works on all screen sizes', confidence: 0.85, action: 'add_feature' },
];

export const AUTO_COMPLETE = {
  SUGGESTION_TYPES: ['spec_section', 'tech_stack', 'feature', 'risk_flag'] as SuggestionType[],
  MAX_RESULTS: 5,
};

export function createAutoComplete(): AutoComplete {
  function scoreSuggestion(suggestion: Suggestion, query: string): number {
    const lowerQuery = query.toLowerCase();
    const labelScore = suggestion.label.toLowerCase().includes(lowerQuery) ? 1.0 : 0;
    const descScore = suggestion.description.toLowerCase().includes(lowerQuery) ? 0.6 : 0;
    const baseScore = Math.max(labelScore, descScore);
    return baseScore * suggestion.confidence;
  }

  const instance: AutoComplete = {
    suggest(request: SuggestionRequest): Suggestion[] {
      const query = request.query?.trim().toLowerCase() ?? '';

      if (!query) return [...TRENDING];

      const matchedLabels = new Set<string>();
      for (const [keyword, labels] of Object.entries(KEYWORD_MAP)) {
        if (query.includes(keyword)) {
          for (const label of labels) matchedLabels.add(label);
        }
      }

      if (matchedLabels.size === 0) {
        const fuzzyMatches = ALL_SUGGESTIONS
          .filter((s) => query.length > 0 && (s.label.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)))
          .map((s) => ({ ...s, confidence: scoreSuggestion(s, query) }))
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, AUTO_COMPLETE.MAX_RESULTS);

        return fuzzyMatches;
      }

      const results = ALL_SUGGESTIONS
        .filter((s) => matchedLabels.has(s.label))
        .map((s) => ({ ...s, confidence: scoreSuggestion(s, query) }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, AUTO_COMPLETE.MAX_RESULTS);

      return results;
    },

    getSuggestions(): Suggestion[] {
      return [...ALL_SUGGESTIONS];
    },
  };

  return instance;
}

export const autoCompleteToolDefinition = {
  name: 'vibemate_suggest',
  description: 'Get real-time suggestions for spec generation based on partial input',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Partial input to get suggestions for' },
      context: {
        type: 'object',
        properties: {
          idea: { type: 'string', description: 'Full idea text for context' },
          stack: { type: 'string', description: 'Target tech stack' },
        },
        description: 'Additional context for better suggestions',
      },
    },
    required: ['query'],
  },
};

const ac = createAutoComplete();

export async function autoCompleteToolHandler(args: { query: string; context?: { idea?: string; stack?: string } }) {
  const results = ac.suggest({ query: args.query, context: args.context });
  const formatted = results.length === 0
    ? 'No suggestions found. Try a different query.'
    : results.map((s, i) =>
        `${i + 1}. [${s.type}] ${s.label}\n   ${s.description}`
      ).join('\n\n');

  return {
    content: [
      {
        type: 'text' as const,
        text: formatted,
      },
    ],
    structuredContent: results,
  };
}
