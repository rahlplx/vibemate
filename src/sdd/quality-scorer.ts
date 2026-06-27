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

function countSyllables(word: string): number {
  const lower = word.toLowerCase();
  let count = 0;
  const vowels = 'aeiouy';
  let prevVowel = false;
  
  for (const char of lower) {
    const isVowel = vowels.includes(char);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }
  
  // Handle silent e
  if (lower.endsWith('e') && count > 1) count--;
  
  return Math.max(1, count);
}

export function scoreUniqueness(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  const lower = text.toLowerCase();
  
  // Generic phrases that indicate low uniqueness
  const genericPhrases = [
    'build a website',
    'make an app',
    'create a tool',
    'build something',
    'make a website',
    'create a website',
    'build an application',
  ];
  
  let score = 80;
  
  // Penalize generic phrases
  for (const phrase of genericPhrases) {
    if (lower.includes(phrase)) {
      score -= 20;
    }
  }
  
  // Bonus for specific technical terms
  const specificTerms = [
    'api', 'microservice', 'saas', 'mvp', 'pipeline',
    'webhook', 'oauth', 'jwt', 'graphql', 'rest',
    'vercel', 'netlify', 'cloudflare', 'supabase',
    'react', 'vue', 'astro', 'svelte', 'bun', 'deno',
  ];
  
  const specificCount = specificTerms.filter(term => lower.includes(term)).length;
  score += specificCount * 5;
  
  // Bonus for unique modifiers
  const uniqueModifiers = [
    'ai-powered', 'real-time', 'serverless', 'edge',
    'micro', 'nano', 'zero-config', 'type-safe',
  ];
  
  const modifierCount = uniqueModifiers.filter(mod => lower.includes(mod)).length;
  score += modifierCount * 8;
  
  return Math.max(0, Math.min(100, score));
}

export function scorePersuasiveness(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  const lower = text.toLowerCase();
  let score = 50;
  
  // CTA indicators
  const ctaIndicators = [
    'deploy', 'launch', 'ship', 'start', 'begin',
    'try', 'test', 'verify', 'validate',
  ];
  
  const ctaCount = ctaIndicators.filter(cta => lower.includes(cta)).length;
  score += ctaCount * 8;
  
  // Urgency indicators
  const urgencyIndicators = [
    'minutes', 'seconds', 'instant', 'immediately', 'now',
    'quick', 'fast', 'rapid',
  ];
  
  const urgencyCount = urgencyIndicators.filter(u => lower.includes(u)).length;
  score += urgencyCount * 5;
  
  // Benefit indicators
  const benefitIndicators = [
    'no credit card', 'free', 'open source', 'no setup',
    'zero config', 'one click', 'one command',
  ];
  
  const benefitCount = benefitIndicators.filter(b => lower.includes(b)).length;
  score += benefitCount * 10;
  
  // Penalize lack of specificity
  if (!lower.match(/\d+/)) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

export function scoreProfessionalism(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  const lower = text.toLowerCase();
  let score = 70;
  
  // Informal indicators (penalize)
  const informalIndicators = [
    'lol', 'idk', 'tbh', 'imo', 'gonna', 'wanna',
    'kinda', 'sorta', 'dunno', 'bruh', 'yolo',
  ];
  
  for (const informal of informalIndicators) {
    if (lower.includes(informal)) {
      score -= 15;
    }
  }
  
  // Professional indicators (boost)
  const professionalIndicators = [
    'api', 'architecture', 'infrastructure', 'deployment',
    'scalable', 'maintainable', 'testable', 'observable',
    'sla', 'uptime', 'latency', 'throughput',
  ];
  
  const profCount = professionalIndicators.filter(p => lower.includes(p)).length;
  score += profCount * 5;
  
  // Bonus for proper sentence structure
  if (text.match(/^[A-Z]/)) score += 5;
  if (text.match(/[.!?]$/)) score += 5;
  
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
