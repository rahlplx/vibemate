// Vibemate SDD — Intent Extraction Module

export interface IntentExtraction {
  rawInput: string;
  inferredIntent: {
    problem: string;
    audience: string;
    successMetric: string;
    constraints: string[];
  };
  gaps: string[];
  confidence: number;
}

// Module-scoped pre-compiled RegExp patterns and keyword arrays
// Hoisted outside functions to eliminate object and RegExp allocation on every invocation
const BUILD_PATTERNS = [
  // "build/create/make/develop [a] X [for/that/which...]"
  /(?:build|create|make|develop)\s+(?:a\s+|an\s+)?(.+?)(?:\s+for\b|\s+that\b|\s+which\b|$)/i,
  // "want/need/like to build/create/make X"
  /(?:want|need|like)\s+to\s+(?:build|create|make|develop|automate)\s+(?:a\s+|an\s+)?(.+?)(?:\s+for\b|\s+that\b|\s+which\b|$)/i,
  // "want/need/looking to automate/improve X"
  /(?:want|need|looking)\s+to\s+(automate|improve|replace|migrate|refactor)\s+(.+?)(?:\s+for\b|\s+that\b|\s+which\b|$)/i,
  // "I need a/an X" — noun-phrase after "need a"
  /(?:i\s+)?need\s+(?:a\s+|an\s+)(.+?)(?:\s+for\b|\s+that\b|\s+which\b|$)/i,
];

const AUDIENCE_PATTERNS = [
  // "targeting X", "aimed at X", "designed for X", "built for X"
  /(?:targeting|aimed\s+at|designed\s+for|built\s+for)\s+(?:a\s+)?(.+?)(?:\s+that\b|\s+who\b|\s*,|\s+with\b|\.|$)/i,
  // "for [a/the] X" — but stop before embedded clauses
  /\bfor\s+(?:a\s+|the\s+)?(?:group\s+of\s+)?([a-z][^,.\s][^,.]*?)(?:\s+that\b|\s+who\b|\s*,|\s+which\b|$)/i,
  // "target audience / users are X"
  /(?:target|audience|users?)\s+(?:is|are|:)\s+(.+?)(?:\s+that\b|\s+who\b|\s*,|$)/i,
];

const AUDIENCE_KEYWORDS = [
  'non-technical founders', 'business owners', 'small business',
  'enterprise teams', 'senior developers', 'junior developers',
  'founders', 'developers', 'designers', 'students',
  'teachers', 'marketers', 'entrepreneurs',
];

const TIME_PATTERNS = [
  /(?:in|under|within|less than)\s+(\d+)\s+(minutes?|hours?|seconds?)/i,
  /(?:deploy|launch|ship)\s+(?:in|under|within)\s+(.+?)(?:\s+that|\s+and|$)/i,
];

const SUCCESS_PATTERNS = [
  /(?:should|must|needs to)\s+(.+?)(?:\s+and|\s+that|\s+\.|$)/i,
  /(?:goal|objective|aim)\s+(?:is\s+)?to\s+(.+?)(?:\s+and|\s+that|\s+\.|$)/i,
  // "to reduce/increase/improve/achieve/reach X" — measurable outcomes
  /(?:to\s+)?(?:reduce|increase|improve|achieve|reach|minimize|maximize)\s+(.+?)(?:\s+and|\s+that|\s+\.|$)/i,
];

const NO_PATTERNS = [
  /no\s+(backend|database|server|auth|authentication|payment)/i,
  /without\s+(backend|database|server|auth|authentication|payment)/i,
];

const MUST_PATTERNS = [
  /must\s+(be\s+)?(mobile|responsive|fast|secure|simple)/i,
  /should\s+(be\s+)?(mobile|responsive|fast|secure|simple)/i,
];

// Module-scoped indicator test regexes
const RE_PROBLEM_IND = /\b(?:build|create|make|need|automate|develop|implement)\b/;
const RE_AUDIENCE_IND = /\b(?:for|targeting|aimed\s+at|designed\s+for|built\s+for|target|audience)\b/;
const RE_METRIC_IND = /\b(?:deploy\w*|launch\w*|ship\w*|reduc\w*|increas\w*|improv\w*|achiev\w*|reach\w*|minimiz\w*|maximiz\w*)\b/;
const RE_CONSTRAINT_IND = /\b(?:no|must|should|without|only|static)\b/;
const RE_PLATFORM_IND = /\b(?:vercel|netlify|cloudflare|aws|gcp|azure)\b/;
const RE_TIME_IND = /\b(?:seconds?|minutes?|hours?|days?|weeks?|months?)\b/;
const RE_GAP_METRIC_IND = /\b(?:deploy\w*|launch\w*|ship\w*|reduc\w*|increas\w*|improv\w*|achiev\w*|reach\w*|minimiz\w*|maximiz\w*|goal|metric|kpi)\b/;
const RE_GAP_CONSTRAINT_IND = /\b(?:no\s+\w+|without|must\s+be|should\s+be|only|static)\b/;

/**
 * Fast zero-allocation word counting.
 * Avoids input.split(/\s+/) string array allocations on high-frequency paths.
 */
function countWords(str: string): number {
  let count = 0;
  let inWord = false;
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 32) {
      if (!inWord) {
        count++;
        inWord = true;
      }
    } else {
      inWord = false;
    }
  }
  return count;
}

export function extractIntent(input: string): IntentExtraction {
  // Compute lowerInput once to avoid redundant lowercasing in sub-routines
  const lowerInput = input.toLowerCase();

  // Extract problem
  const problem = extractProblem(input);
  
  // Extract audience
  const audience = extractAudience(input, lowerInput);
  
  // Extract success metric
  const successMetric = extractSuccessMetric(input);
  
  // Extract constraints
  const constraints = extractConstraints(input, lowerInput);
  
  // Identify gaps using pre-extracted audience and successMetric to avoid duplicate calls
  const gaps = identifyGaps(input, lowerInput, audience, successMetric);
  
  // Calculate confidence
  const confidence = calculateConfidence(input, lowerInput);
  
  return {
    rawInput: input,
    inferredIntent: {
      problem,
      audience,
      successMetric,
      constraints,
    },
    gaps,
    confidence,
  };
}

function extractProblem(input: string): string {
  for (let i = 0; i < BUILD_PATTERNS.length; i++) {
    const match = input.match(BUILD_PATTERNS[i]);
    if (match) {
      // For patterns with two capture groups (automate/improve), join them
      const captured = match[2] ? `${match[1]} ${match[2]}` : match[1];
      return captured.trim();
    }
  }

  // Default: return first sentence or first 100 chars
  const firstSentence = input.split(/[.!?]/)[0];
  return firstSentence.substring(0, 100);
}

function extractAudience(input: string, precomputedLower?: string): string {
  const lowerInput = precomputedLower ?? input.toLowerCase();

  for (let i = 0; i < AUDIENCE_PATTERNS.length; i++) {
    const match = input.match(AUDIENCE_PATTERNS[i]);
    if (match) {
      return match[1].trim();
    }
  }

  // Fallback: multi-word audience keyword scan
  for (let i = 0; i < AUDIENCE_KEYWORDS.length; i++) {
    if (lowerInput.includes(AUDIENCE_KEYWORDS[i])) {
      return AUDIENCE_KEYWORDS[i];
    }
  }

  return 'general users';
}

function extractSuccessMetric(input: string): string {
  // Look for time-based metrics
  for (let i = 0; i < TIME_PATTERNS.length; i++) {
    const match = input.match(TIME_PATTERNS[i]);
    if (match) {
      return match[0].trim();
    }
  }
  
  // Look for other success indicators
  for (let i = 0; i < SUCCESS_PATTERNS.length; i++) {
    const match = input.match(SUCCESS_PATTERNS[i]);
    if (match) {
      return match[1].trim();
    }
  }

  return 'successful completion';
}

function extractConstraints(input: string, precomputedLower?: string): string[] {
  const lowerInput = precomputedLower ?? input.toLowerCase();
  const constraints: string[] = [];
  
  // Look for "no" constraints
  for (let i = 0; i < NO_PATTERNS.length; i++) {
    const match = input.match(NO_PATTERNS[i]);
    if (match) {
      constraints.push(`no ${match[1]}`);
    }
  }
  
  // Look for "must" constraints
  for (let i = 0; i < MUST_PATTERNS.length; i++) {
    const match = input.match(MUST_PATTERNS[i]);
    if (match) {
      constraints.push(match[2].toLowerCase());
    }
  }
  
  // Look for "static" constraints
  if (lowerInput.includes('static')) {
    constraints.push('static');
  }
  
  // Look for "html" constraints
  if (lowerInput.includes('html')) {
    constraints.push('html');
  }
  
  return constraints;
}

export function calculateConfidence(input: string, precomputedLower?: string): number {
  if (!input || input.trim().length === 0) {
    return 0;
  }

  let confidence = 0;
  const lowerInput = precomputedLower ?? input.toLowerCase();

  // Base confidence from word count using zero-allocation character scan
  const wordCount = countWords(input);
  confidence += Math.min(30, wordCount * 2);

  // Problem indicators (build/create/make/need/automate/develop)
  if (RE_PROBLEM_IND.test(lowerInput)) {
    confidence += 15;
  }

  // Audience indicators
  if (RE_AUDIENCE_IND.test(lowerInput)) {
    confidence += 15;
  }

  // Success metric indicators (deploy/launch/ship OR measurable outcomes; match verb forms)
  if (RE_METRIC_IND.test(lowerInput)) {
    confidence += 15;
  }

  // Constraint indicators
  if (RE_CONSTRAINT_IND.test(lowerInput)) {
    confidence += 10;
  }

  // Platform specificity
  if (RE_PLATFORM_IND.test(lowerInput)) {
    confidence += 10;
  }

  // Time specificity
  if (RE_TIME_IND.test(lowerInput)) {
    confidence += 5;
  }

  return Math.min(100, confidence);
}

export function identifyGaps(
  input: string,
  precomputedLower?: string,
  precomputedAudience?: string,
  precomputedMetric?: string
): string[] {
  const gaps: string[] = [];
  const lowerInput = precomputedLower ?? input.toLowerCase();

  // Check for missing problem statement
  if (!RE_PROBLEM_IND.test(lowerInput)) {
    gaps.push('Missing: What do you want to build?');
  }

  // Check for missing audience — broad set of signals
  const hasAudience =
    RE_AUDIENCE_IND.test(lowerInput) ||
    (precomputedAudience ?? extractAudience(input, lowerInput)) !== 'general users';
  if (!hasAudience) {
    gaps.push('Missing audience: Who is this for?');
  }

  // Check for missing success metric — deploy/launch/ship OR measurable outcome verbs
  const hasSuccessMetric =
    RE_GAP_METRIC_IND.test(lowerInput) ||
    (precomputedMetric ?? extractSuccessMetric(input)) !== 'successful completion';
  if (!hasSuccessMetric) {
    gaps.push('Missing success metric: How do you know it succeeded?');
  }

  // Check for missing constraints
  if (!RE_GAP_CONSTRAINT_IND.test(lowerInput)) {
    gaps.push('Missing: Any constraints or requirements?');
  }

  // Check for missing timeline
  if (!RE_TIME_IND.test(lowerInput)) {
    gaps.push("Missing: What's the timeline?");
  }

  return gaps;
}
