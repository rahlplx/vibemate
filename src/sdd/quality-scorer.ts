// Vibemate SDD — Quality Scoring Module

export interface QualityReport {
  overall: number;
  readability: number;
  uniqueness: number;
  persuasiveness: number;
  professionalism: number;
  suggestions: string[];
}

// Module-scoped static indicator and keyword lists to avoid per-call allocations
const GENERIC_PHRASES = [
  'build a website',
  'make an app',
  'create a tool',
  'build something',
  'make a website',
  'create a website',
  'build an application',
];

const SPECIFIC_TERMS = [
  'api', 'microservice', 'saas', 'mvp', 'pipeline',
  'webhook', 'oauth', 'jwt', 'graphql', 'rest',
  'vercel', 'netlify', 'cloudflare', 'supabase',
  'react', 'vue', 'astro', 'svelte', 'bun', 'deno',
];

const UNIQUE_MODIFIERS = [
  'ai-powered', 'real-time', 'serverless', 'edge',
  'micro', 'nano', 'zero-config', 'type-safe',
];

const CTA_INDICATORS = [
  'deploy', 'launch', 'ship', 'start', 'begin',
  'try', 'test', 'verify', 'validate',
];

const URGENCY_INDICATORS = [
  'minutes', 'seconds', 'instant', 'immediately', 'now',
  'quick', 'fast', 'rapid',
];

const BENEFIT_INDICATORS = [
  'no credit card', 'free', 'open source', 'no setup',
  'zero config', 'one click', 'one command',
];

const INFORMAL_INDICATORS = [
  'lol', 'idk', 'tbh', 'imo', 'gonna', 'wanna',
  'kinda', 'sorta', 'dunno', 'bruh', 'yolo',
];

const PROFESSIONAL_INDICATORS = [
  'api', 'architecture', 'infrastructure', 'deployment',
  'scalable', 'maintainable', 'testable', 'observable',
  'sla', 'uptime', 'latency', 'throughput',
];

// Zero-allocation ASCII vowel helper ('a', 'e', 'i', 'o', 'u', 'y')
function isVowelCode(code: number): boolean {
  return code === 97 || code === 101 || code === 105 || code === 111 || code === 117 || code === 121;
}

// Optimized syllable counter avoiding string/array allocations
function countSyllables(word: string): number {
  let count = 0;
  let prevVowel = false;
  const len = word.length;

  for (let i = 0; i < len; i++) {
    // Convert to lowercase ASCII via bitwise OR 32
    const code = word.charCodeAt(i) | 32;
    const isVowel = isVowelCode(code);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }

  // Handle silent trailing 'e' / 'E'
  if (len > 1 && ((word.charCodeAt(len - 1) | 32) === 101) && count > 1) count--;

  return Math.max(1, count);
}

// Zero-allocation loop for term matching
function countMatches(text: string, terms: string[]): number {
  let count = 0;
  for (let i = 0; i < terms.length; i++) {
    if (text.includes(terms[i])) count++;
  }
  return count;
}

export function scoreReadability(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  const words = text.split(/\s+/);
  const sentences = text.split(/[.!?]+/);
  let sentenceCount = 0;
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].trim().length > 0) sentenceCount++;
  }
  
  // Average words per sentence
  const avgWordsPerSentence = words.length / Math.max(1, sentenceCount);
  
  // Score: lower avg words per sentence = more readable
  let score = 100;
  
  // Penalize long sentences (>12 words)
  if (avgWordsPerSentence > 12) score -= (avgWordsPerSentence - 12) * 4;
  
  // Penalize complex words (>2 syllables)
  let complexWords = 0;
  for (let i = 0; i < words.length; i++) {
    if (countSyllables(words[i]) > 2) complexWords++;
  }
  const complexRatio = complexWords / words.length;
  score -= complexRatio * 50;
  
  // Bonus for short, punchy text
  if (words.length <= 10) score += 10;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreUniqueness(text: string, precomputedLower?: string): number {
  if (!text || text.trim().length === 0) return 0;

  const lower = precomputedLower ?? text.toLowerCase();
  let score = 80;
  
  // Penalize generic phrases
  for (let i = 0; i < GENERIC_PHRASES.length; i++) {
    if (lower.includes(GENERIC_PHRASES[i])) {
      score -= 20;
    }
  }
  
  // Bonus for specific technical terms & unique modifiers
  score += countMatches(lower, SPECIFIC_TERMS) * 5;
  score += countMatches(lower, UNIQUE_MODIFIERS) * 8;
  
  return Math.max(0, Math.min(100, score));
}

export function scorePersuasiveness(text: string, precomputedLower?: string): number {
  if (!text || text.trim().length === 0) return 0;

  const lower = precomputedLower ?? text.toLowerCase();
  let score = 50;
  
  // CTA, urgency, and benefit indicators
  score += countMatches(lower, CTA_INDICATORS) * 8;
  score += countMatches(lower, URGENCY_INDICATORS) * 5;
  score += countMatches(lower, BENEFIT_INDICATORS) * 10;
  
  // Penalize lack of specificity
  if (!/\d/.test(lower)) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

export function scoreProfessionalism(text: string, precomputedLower?: string): number {
  if (!text || text.trim().length === 0) return 0;

  const lower = precomputedLower ?? text.toLowerCase();
  let score = 70;
  
  // Informal indicators (penalize)
  for (let i = 0; i < INFORMAL_INDICATORS.length; i++) {
    if (lower.includes(INFORMAL_INDICATORS[i])) {
      score -= 15;
    }
  }
  
  // Professional indicators (boost)
  score += countMatches(lower, PROFESSIONAL_INDICATORS) * 5;
  
  // Bonus for proper sentence structure
  if (/^[A-Z]/.test(text)) score += 5;
  if (/[.!?]$/.test(text)) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

export function calculateOverallQuality(text: string): QualityReport {
  if (!text || text.trim().length === 0) {
    return {
      overall: 0,
      readability: 0,
      uniqueness: 0,
      persuasiveness: 0,
      professionalism: 0,
      suggestions: [
        'Simplify language and shorten sentences',
        'Add specific technical terms or unique modifiers',
        'Include clear CTAs, urgency, or benefits',
        'Remove informal language, add professional terms',
      ],
    };
  }

  const readability = scoreReadability(text);
  const lower = text.toLowerCase();
  const uniqueness = scoreUniqueness(text, lower);
  const persuasiveness = scorePersuasiveness(text, lower);
  const professionalism = scoreProfessionalism(text, lower);
  
  // Weighted average
  const overall = Math.round(
    readability * 0.25 +
    uniqueness * 0.30 +
    persuasiveness * 0.25 +
    professionalism * 0.20
  );
  
  // Generate suggestions
  const suggestions: string[] = [];
  
  if (readability < 60) suggestions.push('Simplify language and shorten sentences');
  if (uniqueness < 60) suggestions.push('Add specific technical terms or unique modifiers');
  if (persuasiveness < 60) suggestions.push('Include clear CTAs, urgency, or benefits');
  if (professionalism < 60) suggestions.push('Remove informal language, add professional terms');
  
  return {
    overall,
    readability,
    uniqueness,
    persuasiveness,
    professionalism,
    suggestions,
  };
}
