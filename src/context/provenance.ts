// Provenance Engine - Source tagging + trust scoring (inspired by Claude Code)
interface TaggedPiece {
  content: string;
  provenance: 'system' | 'codebase' | 'user' | 'tool-output' | 'external';
  source: string;
  trustScore: number;
  timestamp: number;
}

interface QuarantinedPiece {
  content: string;
  sanitizedContent: string;
  isQuarantined: boolean;
  reason: string;
}

// Trust scores for different provenance types
const TRUST_SCORES: Record<string, number> = {
  system: 1.0,
  codebase: 0.9,
  'tool-output': 0.8,
  user: 0.7,
  external: 0.3
};

// Prompt injection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+(instructions|prompts|rules)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /disregard\s+(your|the|all)\s+(instructions|rules|guidelines)/i,
  /new\s+instructions?\s*:/i,
  /system\s*prompt\s*override/i,
  /admin\s+mode\s+activated/i,
  /ignore\s+safety/i,
  /bypass\s+(filters|rules|safety)/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /Human:\s*/i,
  /Assistant:\s*/i
];

// Sanitization patterns for quarantined content
const SANITIZE_PATTERNS = [
  { pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, replacement: '[SCRIPT REMOVED]' },
  { pattern: /javascript:/gi, replacement: '[JS REMOVED]' },
  { pattern: /on\w+\s*=/gi, replacement: '[EVENT REMOVED]' },
  { pattern: /data:(?!image\/)[^\s,]+/gi, replacement: '[DATA REMOVED]' }
];

export class ProvenanceEngine {
  tag(piece: Omit<TaggedPiece, 'trustScore' | 'timestamp'>): TaggedPiece {
    return {
      content: piece.content,
      provenance: piece.provenance,
      source: piece.source,
      trustScore: this.trustScore(piece.provenance),
      timestamp: Date.now()
    };
  }

  trustScore(provenance: TaggedPiece['provenance']): number {
    return TRUST_SCORES[provenance] || 0.5;
  }

  quarantine(piece: TaggedPiece): QuarantinedPiece {
    let sanitized = piece.content;
    let isQuarantined = false;
    let reason = '';

    // Check for injection patterns
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(piece.content)) {
        isQuarantined = true;
        reason = `Potential prompt injection detected: ${pattern.source}`;
        break;
      }
    }

    // Check for malicious content
    if (piece.provenance === 'external') {
      isQuarantined = true;
      reason = reason || 'External content quarantined by default';
    }

    // Sanitize if quarantined
    if (isQuarantined) {
      sanitized = this.sanitize(piece.content);
    }

    return {
      content: piece.content,
      sanitizedContent: sanitized,
      isQuarantined,
      reason
    };
  }

  private sanitize(content: string): string {
    let sanitized = content;
    
    for (const { pattern, replacement } of SANITIZE_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    
    // Remove potential script injections
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[SCRIPT REMOVED]');
    
    // Remove potentially dangerous words
    sanitized = sanitized.replace(/\b(malicious|malware|virus|trojan|exploit)\b/gi, '[REMOVED]');
    
    return sanitized;
  }

  detectInjection(text: string): boolean {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  }
}
