// OKF Bundle Generator with pre-populated architectural decisions
import { OKFBundle, OKFConcept, OKFFrontmatter } from '../types.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Pre-populated architectural decisions with real-world recommended metrics
const PREPOPULATED_DECISIONS: OKFConcept[] = [
  {
    path: 'architecture/auth-strategy.md',
    frontmatter: {
      type: 'architecture-decision',
      title: 'Authentication Strategy',
      description: 'JWT-based authentication with refresh tokens',
      tags: ['security', 'auth', 'jwt'],
      timestamp: new Date().toISOString(),
      decision: 'Use JWT with short-lived access tokens (15min) and long-lived refresh tokens (7d)',
      status: 'accepted',
      consequences: [
        ' Stateless authentication - no server-side session storage',
        ' Token refresh required - implement refresh token rotation',
        ' Revocation requires blocklist - consider Redis for token blacklist'
      ],
      metrics: {
        tokenLifetime: '15 minutes',
        refreshTokenLifetime: '7 days',
        algorithm: 'RS256',
        keyRotation: '90 days'
      }
    },
    body: `
## Decision

We will use JWT-based authentication with short-lived access tokens and long-lived refresh tokens.

## Rationale

- Stateless authentication scales horizontally
- JWT is widely supported across frameworks
- Refresh token rotation provides security without constant re-authentication

## Implementation

- Access token: 15-minute lifetime, RS256 signed
- Refresh token: 7-day lifetime, stored in httpOnly cookie
- Token rotation on each refresh to prevent token reuse attacks

## Metrics

- Target token validation latency: < 5ms
- Key rotation frequency: Every 90 days
- Failed login rate threshold: < 1%
    `
  },
  {
    path: 'architecture/database-choice.md',
    frontmatter: {
      type: 'architecture-decision',
      title: 'Database Choice',
      description: 'PostgreSQL with pgvector for vector search',
      tags: ['database', 'postgres', 'vector'],
      timestamp: new Date().toISOString(),
      decision: 'PostgreSQL 16 with pgvector extension for relational + vector search',
      status: 'accepted',
      consequences: [
        ' Single database for relational and vector data',
        ' ACID compliance for transactional data',
        ' pgvector for AI/ML similarity search'
      ],
      metrics: {
        version: 'PostgreSQL 16',
        maxConnections: 100,
        sharedBuffers: '256MB',
        effectiveCacheSize: '1GB',
        vectorDimension: 1536
      }
    },
    body: `
## Decision

We will use PostgreSQL 16 with pgvector extension for both relational data and vector search.

## Rationale

- Single database reduces operational complexity
- ACID compliance ensures data integrity
- pgvector enables AI/ML features without separate vector DB

## Performance Targets

- Query latency (p95): < 50ms
- Connection pool: 100 connections
- Vector search recall@10: > 95%

## Configuration

- shared_buffers: 256MB
- effective_cache_size: 1GB
- work_mem: 4MB
- maintenance_work_mem: 64MB
    `
  },
  {
    path: 'architecture/api-design.md',
    frontmatter: {
      type: 'architecture-decision',
      title: 'API Design',
      description: 'RESTful API with OpenAPI 3.1 specification',
      tags: ['api', 'rest', 'openapi'],
      timestamp: new Date().toISOString(),
      decision: 'RESTful API with OpenAPI 3.1 spec, versioned via URL path',
      status: 'accepted',
      consequences: [
        ' Clear contract between frontend and backend',
        ' Auto-generated client SDKs from OpenAPI spec',
        ' Versioning via /api/v1/ prefix'
      ],
      metrics: {
        maxResponseSize: '1MB',
        rateLimit: '1000 requests/minute',
        timeout: '30 seconds',
        paginationDefault: 20,
        paginationMax: 100
      }
    },
    body: `
## Decision

We will use RESTful API design with OpenAPI 3.1 specification.

## Rationale

- Industry standard for HTTP APIs
- Auto-generated documentation and client SDKs
- Clear versioning strategy

## Rate Limiting

- Default: 1000 requests/minute per API key
- Burst: 100 requests/second
- Rate limit headers: X-RateLimit-*, Retry-After

## Pagination

- Default page size: 20
- Maximum page size: 100
- Cursor-based pagination for large datasets
    `
  },
  {
    path: 'architecture/testing-strategy.md',
    frontmatter: {
      type: 'architecture-decision',
      title: 'Testing Strategy',
      description: 'TDD with unit, integration, and e2e tests',
      tags: ['testing', 'tdd', 'quality'],
      timestamp: new Date().toISOString(),
      decision: 'TDD-first with 80% unit, 15% integration, 5% e2e test distribution',
      status: 'accepted',
      consequences: [
        ' Tests written before implementation',
        ' High unit test coverage for business logic',
        ' Minimal e2e tests for critical paths only'
      ],
      metrics: {
        unitCoverage: '80%',
        integrationCoverage: '15%',
        e2eCoverage: '5%',
        mutationScore: '> 80%',
        testTimeout: '5000ms'
      }
    },
    body: `
## Decision

We will follow TDD methodology with a pyramid test distribution.

## Test Pyramid

- Unit tests: 80% (business logic, utilities)
- Integration tests: 15% (API endpoints, database queries)
- E2E tests: 5% (critical user flows)

## Quality Gates

- Mutation testing score: > 80%
- Code coverage threshold: 80%
- Test timeout: 5 seconds per test
- No skipped tests in CI

## CI Integration

- Run unit tests on every commit
- Run integration tests on PR
- Run e2e tests on merge to main
    `
  },
  {
    path: 'architecture/security.md',
    frontmatter: {
      type: 'architecture-decision',
      title: 'Security Practices',
      description: 'Defense in depth with OWASP Top 10 mitigation',
      tags: ['security', 'owasp', 'hardening'],
      timestamp: new Date().toISOString(),
      decision: 'Defense in depth with input validation, rate limiting, and CSP headers',
      status: 'accepted',
      consequences: [
        ' Multiple security layers',
        ' Input sanitization on all endpoints',
        ' CSP headers prevent XSS'
      ],
      metrics: {
        maxInputLength: '10KB',
        rateLimitWindow: '1 minute',
        sessionTimeout: '24 hours',
        passwordMinLength: '12 characters',
        bcryptRounds: 12
      }
    },
    body: `
## Decision

We will implement defense-in-depth security practices following OWASP Top 10.

## Input Validation

- Maximum input length: 10KB
- SQL injection prevention: Parameterized queries
- XSS prevention: Output encoding + CSP headers

## Authentication Security

- Password minimum length: 12 characters
- bcrypt rounds: 12
- Session timeout: 24 hours
- Failed login lockout: 5 attempts

## Network Security

- HTTPS only (HSTS enabled)
- CORS restricted to known origins
- CSP headers: default-src 'self'
    `
  },
  {
    path: 'architecture/performance.md',
    frontmatter: {
      type: 'architecture-decision',
      title: 'Performance Targets',
      description: 'Response time and throughput requirements',
      tags: ['performance', 'latency', 'throughput'],
      timestamp: new Date().toISOString(),
      decision: 'API response p95 < 200ms, support 1000 concurrent users',
      status: 'accepted',
      consequences: [
        ' Database query optimization required',
        ' Caching strategy for hot paths',
        ' Connection pooling mandatory'
      ],
      metrics: {
        apiP95: '200ms',
        apiP99: '500ms',
        concurrentUsers: 1000,
        requestsPerSecond: 500,
        cacheHitRate: '> 80%'
      }
    },
    body: `
## Decision

We will target API response times of p95 < 200ms and support 1000 concurrent users.

## Response Time Targets

- API p95: < 200ms
- API p99: < 500ms
- Database query p95: < 50ms
- Cache lookup: < 5ms

## Throughput Targets

- Concurrent users: 1000
- Requests per second: 500
- WebSocket connections: 5000

## Caching Strategy

- Redis for session cache (TTL: 24h)
- Application-level cache for hot paths (TTL: 5min)
- CDN for static assets (TTL: 1h)
    `
  }
];

// OKF Index template
const OKF_INDEX_TEMPLATE = `---
okf_version: "0.1"
type: index
title: "{{projectName}} Knowledge Bundle"
description: Architectural decisions, learnings, and references for {{projectName}}
---

# {{projectName}} Knowledge Bundle

This OKF bundle contains architectural decisions, learnings, and references for the project.

## Sections

- [Architecture Decisions](./architecture/) - Accepted architectural decisions
- [Learnings](./learnings/) - Retro learnings and anti-patterns
- [References](./references/) - External documentation and patterns

## Usage

AI agents read this bundle to understand project context. Each concept file has YAML frontmatter with a required \`type\` field.

## Update History

See [log.md](./log.md) for the update history.
`;

// OKF Log template
const OKF_LOG_TEMPLATE = `---
type: log
title: Update History
---

# Update History

## {{date}} - Initial Bundle Creation

**Update**: Created initial OKF bundle with architectural decisions

**Decisions Added**:
- Authentication Strategy (JWT with refresh tokens)
- Database Choice (PostgreSQL + pgvector)
- API Design (RESTful with OpenAPI 3.1)
- Testing Strategy (TDD with pyramid distribution)
- Security Practices (Defense in depth)
- Performance Targets (p95 < 200ms)
`;

export class OKFGenerator {
  readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async generate(projectName: string): Promise<OKFBundle> {
    const bundleRoot = join(this.root, '.agents', 'okf-bundle');
    
    // Create directory structure
    await mkdir(join(bundleRoot, 'architecture'), { recursive: true });
    await mkdir(join(bundleRoot, 'learnings'), { recursive: true });
    await mkdir(join(bundleRoot, 'references'), { recursive: true });

    // Write index.md
    const indexContent = OKF_INDEX_TEMPLATE.replace(/\{\{projectName\}\}/g, projectName);
    await writeFile(join(bundleRoot, 'index.md'), indexContent);

    // Write log.md
    const logContent = OKF_LOG_TEMPLATE.replace(/\{\{date\}\}/g, new Date().toISOString().split('T')[0]);
    await writeFile(join(bundleRoot, 'log.md'), logContent);

    // Write pre-populated architectural decisions
    const concepts: OKFConcept[] = [];
    for (const concept of PREPOPULATED_DECISIONS) {
      const conceptPath = join(bundleRoot, concept.path);
      await mkdir(join(conceptPath, '..'), { recursive: true });
      
      const content = this.formatConcept(concept);
      await writeFile(conceptPath, content);
      concepts.push(concept);
    }

    return {
      root: bundleRoot,
      version: '0.1',
      concepts,
      index: {
        path: 'index.md',
        frontmatter: {
          type: 'index',
          title: `${projectName} Knowledge Bundle`,
          description: `Architectural decisions, learnings, and references for ${projectName}`
        },
        body: indexContent
      },
      log: {
        path: 'log.md',
        frontmatter: {
          type: 'log',
          title: 'Update History'
        },
        body: logContent
      }
    };
  }

  private formatConcept(concept: OKFConcept): string {
    const frontmatter = this.formatFrontmatter(concept.frontmatter);
    return `---\n${frontmatter}---\n\n${concept.body.trim()}\n`;
  }

  private formatFrontmatter(fm: OKFFrontmatter): string {
    let result = '';
    result += `type: ${fm.type}\n`;
    if (fm.title) result += `title: "${fm.title}"\n`;
    if (fm.description) result += `description: "${fm.description}"\n`;
    if (fm.resource) result += `resource: "${fm.resource}"\n`;
    if (fm.tags) result += `tags: [${fm.tags.join(', ')}]\n`;
    if (fm.timestamp) result += `timestamp: "${fm.timestamp}"\n`;
    
    // Add any additional fields
    const knownKeys = ['type', 'title', 'description', 'resource', 'tags', 'timestamp'];
    for (const [key, value] of Object.entries(fm)) {
      if (!knownKeys.includes(key)) {
        if (typeof value === 'object') {
          result += `${key}:\n${JSON.stringify(value, null, 2).split('\n').map(l => '  ' + l).join('\n')}\n`;
        } else {
          result += `${key}: ${JSON.stringify(value)}\n`;
        }
      }
    }
    return result;
  }

  async query(bundle: OKFBundle, type?: string, tags?: string[]): Promise<OKFConcept[]> {
    let concepts = bundle.concepts;
    
    if (type) {
      concepts = concepts.filter(c => c.frontmatter.type === type);
    }
    
    if (tags && tags.length > 0) {
      concepts = concepts.filter(c => 
        c.frontmatter.tags?.some(t => tags.includes(t))
      );
    }
    
    return concepts;
  }

  async addLearning(bundle: OKFBundle, learning: {
    title: string;
    description: string;
    lesson: string;
    type: 'success' | 'failure' | 'anti-pattern';
    tags: string[];
  }): Promise<OKFConcept> {
    const concept: OKFConcept = {
      path: `learnings/retro-${learning.title.toLowerCase().replace(/\s+/g, '-')}.md`,
      frontmatter: {
        type: 'retro-learning',
        title: learning.title,
        description: learning.description,
        tags: learning.tags,
        timestamp: new Date().toISOString(),
        learningType: learning.type
      },
      body: `
## Learning

${learning.lesson}

## Context

This learning was captured from retrospective analysis of completed work.

## Application

Apply this learning when similar situations arise in future tasks.
      `
    };

    const conceptPath = join(bundle.root, concept.path);
    const content = this.formatConcept(concept);
    
    // Create directory if it doesn't exist
    const dir = conceptPath.substring(0, conceptPath.lastIndexOf('/')) || conceptPath.substring(0, conceptPath.lastIndexOf('\\'));
    if (dir) {
      await mkdir(dir, { recursive: true });
    }
    
    await writeFile(conceptPath, content);
    
    bundle.concepts.push(concept);
    return concept;
  }
}
