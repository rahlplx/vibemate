// Vibemate SDD — Quality Scoring Module

export interface QualityReport {
  overall: number;
  readability: number;
  uniqueness: number;
  persuasiveness: number;
  professionalism: number;
  suggestions: string[];
}

export function scoreReadability(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  const words = text.split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Average words per sentence
  const avgWordsPerSentence = words.length / Math.max(1, sentences.length);
  
  // Score: lower avg words per sentence = more readable
  let score = 100;
  
  // Penalize long sentences (>12 words)
  if (avgWordsPerSentence > 12) score -= (avgWordsPerSentence - 12) * 4;
  
  // Penalize complex words (>2 syllables)
  const complexWords = words.filter(w => countSyllables(w) > 2).length;
  const complexRatio = complexWords / words.length;
  score -= complexRatio * 50;
  
  // Bonus for short, punchy text
  if (words.length <= 10) score += 10;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Fast syllable counter using character code checking instead of string search (vowels.includes)
function countSyllables(word: string): number {
  const lower = word.toLowerCase();
  let count = 0;
  let prevVowel = false;
  
  // Iterate by charCodeAt to avoid string allocation per character
  for (let i = 0; i < lower.length; i++) {
    const code = lower.charCodeAt(i);
    // ASCII codes for 'a' (97), 'e' (101), 'i' (105), 'o' (111), 'u' (117), 'y' (121)
    const isVowel = code === 97 || code === 101 || code === 105 || code === 111 || code === 117 || code === 121;
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }
  
  // Handle silent e
  if (lower.endsWith('e') && count > 1) count--;
  
  return Math.max(1, count);
}

// Pre-defined static word lists to avoid re-allocation on each function call
const genericPhrases = [
  'build a website',
  'make an app',
  'create a tool',
  'build something',
  'make a website',
  'create a website',
  'build an application',
];

const specificTerms = [
  'api', 'microservice', 'saas', 'mvp', 'pipeline',
  'webhook', 'oauth', 'jwt', 'graphql', 'rest',
  'vercel', 'netlify', 'cloudflare', 'supabase',
  'react', 'vue', 'astro', 'svelte', 'bun', 'deno',
];

const uniqueModifiers = [
  'ai-powered', 'real-time', 'serverless', 'edge',
  'micro', 'nano', 'zero-config', 'type-safe',
];

const ctaIndicators = [
  'deploy', 'launch', 'ship', 'start', 'begin',
  'try', 'test', 'verify', 'validate',
];

const urgencyIndicators = [
  'minutes', 'seconds', 'instant', 'immediately', 'now',
  'quick', 'fast', 'rapid',
];

const benefitIndicators = [
  'no credit card', 'free', 'open source', 'no setup',
  'zero config', 'one click', 'one command',
];

const informalIndicators = [
  'lol', 'idk', 'tbh', 'imo', 'gonna', 'wanna',
  'kinda', 'sorta', 'dunno', 'bruh', 'yolo',
];

const professionalIndicators = [
  'api', 'architecture', 'infrastructure', 'deployment',
  'scalable', 'maintainable', 'testable', 'observable',
  'sla', 'uptime', 'latency', 'throughput',
];

export function scoreUniqueness(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  const lower = text.toLowerCase();
  let score = 80;
  
  // Penalize generic phrases using fast indexed loop
  for (let i = 0; i < genericPhrases.length; i++) {
    if (lower.includes(genericPhrases[i])) {
      score -= 20;
    }
  }
  
  // Bonus for specific technical terms without array allocation (.filter)
  for (let i = 0; i < specificTerms.length; i++) {
    if (lower.includes(specificTerms[i])) {
      score += 5;
    }
  }
  
  // Bonus for unique modifiers
  for (let i = 0; i < uniqueModifiers.length; i++) {
    if (lower.includes(uniqueModifiers[i])) {
      score += 8;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

export function scorePersuasiveness(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  const lower = text.toLowerCase();
  let score = 50;
  
  // CTA indicators
  for (let i = 0; i < ctaIndicators.length; i++) {
    if (lower.includes(ctaIndicators[i])) {
      score += 8;
    }
  }
  
  // Urgency indicators
  for (let i = 0; i < urgencyIndicators.length; i++) {
    if (lower.includes(urgencyIndicators[i])) {
      score += 5;
    }
  }
  
  // Benefit indicators
  for (let i = 0; i < benefitIndicators.length; i++) {
    if (lower.includes(benefitIndicators[i])) {
      score += 10;
    }
  }
  
  // Penalize lack of specificity
  if (!/\d/.test(lower)) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

export function scoreProfessionalism(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  const lower = text.toLowerCase();
  let score = 70;
  
  // Informal indicators (penalize)
  for (let i = 0; i < informalIndicators.length; i++) {
    if (lower.includes(informalIndicators[i])) {
      score -= 15;
    }
  }
  
  // Professional indicators (boost)
  for (let i = 0; i < professionalIndicators.length; i++) {
    if (lower.includes(professionalIndicators[i])) {
      score += 5;
    }
  }
  
  // Bonus for proper sentence structure
  if (/^[A-Z]/.test(text)) score += 5;
  if (/[.!?]$/.test(text)) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

export function calculateOverallQuality(text: string): QualityReport {
  const readability = scoreReadability(text);
  const uniqueness = scoreUniqueness(text);
  const persuasiveness = scorePersuasiveness(text);
  const professionalism = scoreProfessionalism(text);
  
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
