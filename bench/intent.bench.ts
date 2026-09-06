import { extractIntent } from "../src/sdd/intent-extractor";

// Module scope patterns for optimized version
const BUILD_PATTERNS = [
  /(?:build|create|make|develop)\s+(?:a\s+|an\s+)?(.+?)(?:\s+for\b|\s+that\b|\s+which\b|$)/i,
  /(?:want|need|like)\s+to\s+(?:build|create|make|develop|automate)\s+(?:a\s+|an\s+)?(.+?)(?:\s+for\b|\s+that\b|\s+which\b|$)/i,
  /(?:want|need|looking)\s+to\s+(automate|improve|replace|migrate|refactor)\s+(.+?)(?:\s+for\b|\s+that\b|\s+which\b|$)/i,
  /(?:i\s+)?need\s+(?:a\s+|an\s+)(.+?)(?:\s+for\b|\s+that\b|\s+which\b|$)/i,
];

const AUDIENCE_PATTERNS = [
  /(?:targeting|aimed\s+at|designed\s+for|built\s+for)\s+(?:a\s+)?(.+?)(?:\s+that\b|\s+who\b|\s*,|\s+with\b|\.|$)/i,
  /\bfor\s+(?:a\s+|the\s+)?(?:group\s+of\s+)?([a-z][^,.\s][^,.]*?)(?:\s+that\b|\s+who\b|\s*,|\s+which\b|$)/i,
  /(?:target|audience|users?)\s+(?:is|are|:)\s+(.+?)(?:\s+that\b|\s+who\b|\s*,|$)/i,
];

const AUDIENCE_KEYWORDS = [
  "non-technical founders", "business owners", "small business",
  "enterprise teams", "senior developers", "junior developers",
  "founders", "developers", "designers", "students",
  "teachers", "marketers", "entrepreneurs",
];

const TIME_PATTERNS = [
  /(?:in|under|within|less than)\s+(\d+)\s+(minutes?|hours?|seconds?)/i,
  /(?:deploy|launch|ship)\s+(?:in|under|within)\s+(.+?)(?:\s+that|\s+and|$)/i,
];

const SUCCESS_PATTERNS = [
  /(?:should|must|needs to)\s+(.+?)(?:\s+and|\s+that|\s+\.|$)/i,
  /(?:goal|objective|aim)\s+(?:is\s+)?to\s+(.+?)(?:\s+and|\s+that|\s+\.|$)/i,
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

const RE_PROBLEM_IND = /\b(?:build|create|make|need|automate|develop|implement)\b/;
const RE_AUDIENCE_IND = /\b(?:for|targeting|aimed\s+at|designed\s+for|target|audience)\b/;
const RE_METRIC_IND = /\b(?:deploy\w*|launch\w*|ship\w*|reduc\w*|increas\w*|improv\w*|achiev\w*|reach\w*|minimiz\w*|maximiz\w*)\b/;
const RE_CONSTRAINT_IND = /\b(?:no|must|should|without|only|static)\b/;
const RE_PLATFORM_IND = /\b(?:vercel|netlify|cloudflare|aws|gcp|azure)\b/;
const RE_TIME_IND = /\b(?:seconds?|minutes?|hours?|days?|weeks?|months?)\b/;
const RE_GAP_METRIC_IND = /\b(?:deploy\w*|launch\w*|ship\w*|reduc\w*|increas\w*|improv\w*|achiev\w*|reach\w*|minimiz\w*|maximiz\w*|goal|metric|kpi)\b/;
const RE_GAP_CONSTRAINT_IND = /\b(?:no\s+\w+|without|must\s+be|should\s+be|only|static)\b/;

function countWordsFast(str: string): number {
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

function extractProblemOpt(input: string): string {
  for (let i = 0; i < BUILD_PATTERNS.length; i++) {
    const match = input.match(BUILD_PATTERNS[i]);
    if (match) {
      const captured = match[2] ? `${match[1]} ${match[2]}` : match[1];
      return captured.trim();
    }
  }
  const firstSentence = input.split(/[.!?]/)[0];
  return firstSentence.substring(0, 100);
}

function extractAudienceOpt(input: string, lowerInput: string): string {
  for (let i = 0; i < AUDIENCE_PATTERNS.length; i++) {
    const match = input.match(AUDIENCE_PATTERNS[i]);
    if (match) {
      return match[1].trim();
    }
  }
  for (let i = 0; i < AUDIENCE_KEYWORDS.length; i++) {
    if (lowerInput.includes(AUDIENCE_KEYWORDS[i])) {
      return AUDIENCE_KEYWORDS[i];
    }
  }
  return "general users";
}

function extractSuccessMetricOpt(input: string): string {
  for (let i = 0; i < TIME_PATTERNS.length; i++) {
    const match = input.match(TIME_PATTERNS[i]);
    if (match) return match[0].trim();
  }
  for (let i = 0; i < SUCCESS_PATTERNS.length; i++) {
    const match = input.match(SUCCESS_PATTERNS[i]);
    if (match) return match[1].trim();
  }
  return "successful completion";
}

function extractConstraintsOpt(input: string, lowerInput: string): string[] {
  const constraints: string[] = [];
  for (let i = 0; i < NO_PATTERNS.length; i++) {
    const match = input.match(NO_PATTERNS[i]);
    if (match) constraints.push(`no ${match[1]}`);
  }
  for (let i = 0; i < MUST_PATTERNS.length; i++) {
    const match = input.match(MUST_PATTERNS[i]);
    if (match) constraints.push(match[2].toLowerCase());
  }
  if (lowerInput.includes("static")) constraints.push("static");
  if (lowerInput.includes("html")) constraints.push("html");
  return constraints;
}

function calculateConfidenceOpt(input: string, lowerInput: string): number {
  if (!input || input.trim().length === 0) return 0;
  let confidence = 0;
  const wordCount = countWordsFast(input);
  confidence += Math.min(30, wordCount * 2);

  if (RE_PROBLEM_IND.test(lowerInput)) confidence += 15;
  if (RE_AUDIENCE_IND.test(lowerInput)) confidence += 15;
  if (RE_METRIC_IND.test(lowerInput)) confidence += 15;
  if (RE_CONSTRAINT_IND.test(lowerInput)) confidence += 10;
  if (RE_PLATFORM_IND.test(lowerInput)) confidence += 10;
  if (RE_TIME_IND.test(lowerInput)) confidence += 5;

  return Math.min(100, confidence);
}

function identifyGapsOpt(input: string, lowerInput: string, audience?: string, successMetric?: string): string[] {
  const gaps: string[] = [];
  if (!RE_PROBLEM_IND.test(lowerInput)) {
    gaps.push("Missing: What do you want to build?");
  }
  const hasAudience = RE_AUDIENCE_IND.test(lowerInput) || (audience ?? extractAudienceOpt(input, lowerInput)) !== "general users";
  if (!hasAudience) {
    gaps.push("Missing audience: Who is this for?");
  }
  const hasSuccessMetric = RE_GAP_METRIC_IND.test(lowerInput) || (successMetric ?? extractSuccessMetricOpt(input)) !== "successful completion";
  if (!hasSuccessMetric) {
    gaps.push("Missing success metric: How do you know it succeeded?");
  }
  if (!RE_GAP_CONSTRAINT_IND.test(lowerInput)) {
    gaps.push("Missing: Any constraints or requirements?");
  }
  if (!RE_TIME_IND.test(lowerInput)) {
    gaps.push("Missing: What's the timeline?");
  }
  return gaps;
}

function extractIntentOpt(input: string) {
  const lowerInput = input.toLowerCase();
  const problem = extractProblemOpt(input);
  const audience = extractAudienceOpt(input, lowerInput);
  const successMetric = extractSuccessMetricOpt(input);
  const constraints = extractConstraintsOpt(input, lowerInput);
  const gaps = identifyGapsOpt(input, lowerInput, audience, successMetric);
  const confidence = calculateConfidenceOpt(input, lowerInput);

  return {
    rawInput: input,
    inferredIntent: { problem, audience, successMetric, constraints },
    gaps,
    confidence,
  };
}

const inputs = [
  "I want to build a landing page generator for non-technical founders that deploys in 5 minutes with no backend",
  "Build a tool for small business owners",
  "I need a fast API gateway for enterprise teams that should reduce bounce rate by 30%",
  "No backend, static HTML only, must work on mobile",
  "Build me something cool",
  "Build a marketing tool targeting enterprise teams that deploys to Vercel in 5 minutes with no backend"
];

// Verify equivalence
for (const input of inputs) {
  const orig = extractIntent(input);
  const opt = extractIntentOpt(input);
  if (JSON.stringify(orig) !== JSON.stringify(opt)) {
    console.error("Mismatch for input:", input);
    console.error("Orig:", JSON.stringify(orig, null, 2));
    console.error("Opt:", JSON.stringify(opt, null, 2));
    process.exit(1);
  }
}
console.log("Output verification passed!");

const N = 100000;
const startOrig = performance.now();
for (let i = 0; i < N; i++) {
  extractIntent(inputs[i % inputs.length]);
}
const durOrig = performance.now() - startOrig;

const startOpt = performance.now();
for (let i = 0; i < N; i++) {
  extractIntentOpt(inputs[i % inputs.length]);
}
const durOpt = performance.now() - startOpt;

console.log(`Original extractIntent: ${durOrig.toFixed(2)} ms (${(N / (durOrig / 1000)).toFixed(0)} ops/sec)`);
console.log(`Optimized extractIntent: ${durOpt.toFixed(2)} ms (${(N / (durOpt / 1000)).toFixed(0)} ops/sec)`);
console.log(`Speedup: ${(durOrig / durOpt).toFixed(2)}x`);
