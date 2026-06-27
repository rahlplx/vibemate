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
  const lowerInput = input.toLowerCase();
  
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
  const lowerInput = input.toLowerCase();
  
  // Look for "build", "create", "make", "develop"
  const buildPatterns = [
    /(?:build|create|make|develop)\s+(?:a\s+)?(.+?)(?:\s+for|\s+that|\s+which|$)/i,
    /(?:want|need|like)\s+to\s+(?:build|create|make|develop)\s+(?:a\s+)?(.+?)(?:\s+for|\s+that|\s+which|$)/i,
  ];
  
  for (const pattern of buildPatterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Default: return first sentence or first 50 chars
  const firstSentence = input.split(/[.!?]/)[0];
  return firstSentence.substring(0, 100);
}

function extractAudience(input: string): string {
  const lowerInput = input.toLowerCase();
  
  // Look for "for" followed by audience
  const audiencePatterns = [
    /for\s+(?:a\s+)?(?:group\s+of\s+)?(.+?)(?:\s+that|\s+who|\s+,|$)/i,
    /(?:target|audience|users?)\s+(?:is|are|:)\s+(.+?)(?:\s+that|\s+who|\s+,|$)/i,
  ];
  
  for (const pattern of audiencePatterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Look for common audience keywords
  const audienceKeywords = [
    'founders', 'developers', 'designers', 'business owners',
    'students', 'teachers', 'marketers', 'entrepreneurs',
  ];
  
  for (const keyword of audienceKeywords) {
    if (lowerInput.includes(keyword)) {
      return keyword;
    }
  }
  
  return 'general users';
}

function extractSuccessMetric(input: string): string {
  const lowerInput = input.toLowerCase();
  
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
  
  // Check for problem indicators
  if (lowerInput.includes('build') || lowerInput.includes('create') || lowerInput.includes('make')) {
    confidence += 15;
  }
  
  // Check for audience indicators
  if (lowerInput.includes('for') || lowerInput.includes('target') || lowerInput.includes('audience')) {
    confidence += 15;
  }
  
  // Check for success metric indicators
  if (lowerInput.includes('deploy') || lowerInput.includes('launch') || lowerInput.includes('ship')) {
    confidence += 15;
  }
  
  // Check for constraint indicators
  if (lowerInput.includes('no') || lowerInput.includes('must') || lowerInput.includes('should')) {
    confidence += 10;
  }
  
  // Check for specific details
  if (lowerInput.includes('vercel') || lowerInput.includes('netlify') || lowerInput.includes('cloudflare')) {
    confidence += 10;
  }
  
  if (lowerInput.includes('minutes') || lowerInput.includes('hours') || lowerInput.includes('seconds')) {
    confidence += 5;
  }
  
  return Math.min(100, confidence);
}

export function identifyGaps(input: string): string[] {
  const gaps: string[] = [];
  const lowerInput = input.toLowerCase();
  
  // Check for missing problem
  if (!lowerInput.includes('build') && !lowerInput.includes('create') && !lowerInput.includes('make')) {
    gaps.push('Missing: What do you want to build?');
  }
  
  // Check for missing audience
  if (!lowerInput.includes('for') && !lowerInput.includes('target') && !lowerInput.includes('audience')) {
    gaps.push('Missing audience: Who is this for?');
  }
  
  // Check for missing success metric
  if (!lowerInput.includes('deploy') && !lowerInput.includes('launch') && !lowerInput.includes('ship')) {
    gaps.push('Missing success metric: How do you know it succeeded?');
  }
  
  // Check for missing constraints
  if (!lowerInput.includes('no') && !lowerInput.includes('must') && !lowerInput.includes('should')) {
    gaps.push('Missing: Any constraints or requirements?');
  }
  
  // Check for missing timeline
  if (!lowerInput.includes('minute') && !lowerInput.includes('hour') && !lowerInput.includes('day')) {
    gaps.push('Missing: What\'s the timeline?');
  }
  
  return gaps;
}
