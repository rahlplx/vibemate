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

export function extractIntent(input: string): IntentExtraction {
  // Extract problem
  const problem = extractProblem(input);
  
  // Extract audience
  const audience = extractAudience(input);
  
  // Extract success metric
  const successMetric = extractSuccessMetric(input);
  
  // Extract constraints
  const constraints = extractConstraints(input);
  
  // Identify gaps
  const gaps = identifyGaps(input);
  
  // Calculate confidence
  const confidence = calculateConfidence(input);
  
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
  const buildPatterns = [
    // "build/create/make/develop [a] X [for/that/which...]"
    /(?:build|create|make|develop)\s+(?:a\s+|an\s+)?(.+?)(?:\s+for\b|\s+that\b|\s+which\b|$)/i,
    // "want/need/like to build/create/make X"
    /(?:want|need|like)\s+to\s+(?:build|create|make|develop|automate)\s+(?:a\s+|an\s+)?(.+?)(?:\s+for\b|\s+that\b|\s+which\b|$)/i,
    // "want/need/looking to automate/improve X"
    /(?:want|need|looking)\s+to\s+(automate|improve|replace|migrate|refactor)\s+(.+?)(?:\s+for\b|\s+that\b|\s+which\b|$)/i,
    // "I need a/an X" — noun-phrase after "need a"
    /(?:i\s+)?need\s+(?:a\s+|an\s+)(.+?)(?:\s+for\b|\s+that\b|\s+which\b|$)/i,
  ];

  for (const pattern of buildPatterns) {
    const match = input.match(pattern);
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

function extractAudience(input: string): string {
  const lowerInput = input.toLowerCase();

  // Ordered from most specific to least specific
  const audiencePatterns = [
    // "targeting X", "aimed at X", "designed for X", "built for X"
    /(?:targeting|aimed\s+at|designed\s+for|built\s+for)\s+(?:a\s+)?(.+?)(?:\s+that\b|\s+who\b|\s*,|\s+with\b|\.|$)/i,
    // "for [a/the] X" — but stop before embedded clauses
    /\bfor\s+(?:a\s+|the\s+)?(?:group\s+of\s+)?([a-z][^,.\s][^,.]*?)(?:\s+that\b|\s+who\b|\s*,|\s+which\b|$)/i,
    // "target audience / users are X"
    /(?:target|audience|users?)\s+(?:is|are|:)\s+(.+?)(?:\s+that\b|\s+who\b|\s*,|$)/i,
  ];

  for (const pattern of audiencePatterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Fallback: multi-word audience keyword scan (longer matches first to avoid substring shadowing)
  const audienceKeywords = [
    'non-technical founders', 'business owners', 'small business',
    'enterprise teams', 'senior developers', 'junior developers',
    'founders', 'developers', 'designers', 'students',
    'teachers', 'marketers', 'entrepreneurs',
  ];

  for (const keyword of audienceKeywords) {
    if (lowerInput.includes(keyword)) {
      return keyword;
    }
  }

  return 'general users';
}

function extractSuccessMetric(input: string): string {
  // Look for time-based metrics
  const timePatterns = [
    /(?:in|under|within|less than)\s+(\d+)\s+(minutes?|hours?|seconds?)/i,
    /(?:deploy|launch|ship)\s+(?:in|under|within)\s+(.+?)(?:\s+that|\s+and|$)/i,
  ];
  
  for (const pattern of timePatterns) {
    const match = input.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  // Look for other success indicators
  const successPatterns = [
    /(?:should|must|needs to)\s+(.+?)(?:\s+and|\s+that|\s+\.|$)/i,
    /(?:goal|objective|aim)\s+(?:is\s+)?to\s+(.+?)(?:\s+and|\s+that|\s+\.|$)/i,
    // "to reduce/increase/improve/achieve/reach X" — measurable outcomes
    /(?:to\s+)?(?:reduce|increase|improve|achieve|reach|minimize|maximize)\s+(.+?)(?:\s+and|\s+that|\s+\.|$)/i,
  ];

  for (const pattern of successPatterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return 'successful completion';
}

function extractConstraints(input: string): string[] {
  const lowerInput = input.toLowerCase();
  const constraints: string[] = [];
  
  // Look for "no" constraints
  const noPatterns = [
    /no\s+(backend|database|server|auth|authentication|payment)/i,
    /without\s+(backend|database|server|auth|authentication|payment)/i,
  ];
  
  for (const pattern of noPatterns) {
    const match = input.match(pattern);
    if (match) {
      constraints.push(`no ${match[1]}`);
    }
  }
  
  // Look for "must" constraints
  const mustPatterns = [
    /must\s+(be\s+)?(mobile|responsive|fast|secure|simple)/i,
    /should\s+(be\s+)?(mobile|responsive|fast|secure|simple)/i,
  ];
  
  for (const pattern of mustPatterns) {
    const match = input.match(pattern);
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

export function calculateConfidence(input: string): number {
  if (!input || input.trim().length === 0) {
    return 0;
  }

  let confidence = 0;
  const lowerInput = input.toLowerCase();

  // Base confidence from length
  const wordCount = input.split(/\s+/).length;
  confidence += Math.min(30, wordCount * 2);

  // Problem indicators (build/create/make/need/automate/develop)
  if (/\b(?:build|create|make|need|automate|develop|implement)\b/.test(lowerInput)) {
    confidence += 15;
  }

  // Audience indicators
  if (/\b(?:for|targeting|aimed\s+at|designed\s+for|target|audience)\b/.test(lowerInput)) {
    confidence += 15;
  }

  // Success metric indicators (deploy/launch/ship OR measurable outcomes; match verb forms)
  if (/\b(?:deploy\w*|launch\w*|ship\w*|reduc\w*|increas\w*|improv\w*|achiev\w*|reach\w*|minimiz\w*|maximiz\w*)\b/.test(lowerInput)) {
    confidence += 15;
  }

  // Constraint indicators
  if (/\b(?:no|must|should|without|only|static)\b/.test(lowerInput)) {
    confidence += 10;
  }

  // Platform specificity
  if (/\b(?:vercel|netlify|cloudflare|aws|gcp|azure)\b/.test(lowerInput)) {
    confidence += 10;
  }

  // Time specificity
  if (/\b(?:seconds?|minutes?|hours?|days?|weeks?|months?)\b/.test(lowerInput)) {
    confidence += 5;
  }

  return Math.min(100, confidence);
}

export function identifyGaps(input: string): string[] {
  const gaps: string[] = [];
  const lowerInput = input.toLowerCase();

  // Check for missing problem statement
  if (!/\b(?:build|create|make|need|automate|develop|implement)\b/.test(lowerInput)) {
    gaps.push('Missing: What do you want to build?');
  }

  // Check for missing audience — broad set of signals
  const hasAudience =
    /\b(?:for|targeting|aimed\s+at|designed\s+for|built\s+for|target|audience)\b/.test(lowerInput) ||
    extractAudience(input) !== 'general users';
  if (!hasAudience) {
    gaps.push('Missing audience: Who is this for?');
  }

  // Check for missing success metric — deploy/launch/ship OR measurable outcome verbs (match conjugations)
  const hasSuccessMetric = /\b(?:deploy\w*|launch\w*|ship\w*|reduc\w*|increas\w*|improv\w*|achiev\w*|reach\w*|minimiz\w*|maximiz\w*|goal|metric|kpi)\b/.test(lowerInput) ||
    extractSuccessMetric(input) !== 'successful completion';
  if (!hasSuccessMetric) {
    gaps.push('Missing success metric: How do you know it succeeded?');
  }

  // Check for missing constraints
  if (!/\b(?:no\s+\w+|without|must\s+be|should\s+be|only|static)\b/.test(lowerInput)) {
    gaps.push('Missing: Any constraints or requirements?');
  }

  // Check for missing timeline
  if (!/\b(?:seconds?|minutes?|hours?|days?|weeks?|months?)\b/.test(lowerInput)) {
    gaps.push("Missing: What's the timeline?");
  }

  return gaps;
}
