// PageForge — Generator Tests

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  checkRateLimit,
  validateInput,
  validateTemplate,
  generatePrompt,
  generateLandingPage,
  __testing,
} from '../src/lib/generator';

describe('Generator', () => {
  beforeEach(() => {
    // Clear rate limiter before each test
    __testing.rateLimiter.clear();
  });

  describe('checkRateLimit', () => {
    it('allows requests within limit', () => {
      expect(checkRateLimit('user1')).toBe(true);
    });

    it('blocks requests over limit', () => {
      // Exhaust rate limit
      for (let i = 0; i < __testing.RATE_LIMIT; i++) {
        checkRateLimit('user2');
      }
      expect(checkRateLimit('user2')).toBe(false);
    });

    it('tracks different users separately', () => {
      // Exhaust limit for user1
      for (let i = 0; i < __testing.RATE_LIMIT; i++) {
        checkRateLimit('user1');
      }
      // user2 should still be allowed
      expect(checkRateLimit('user2')).toBe(true);
    });
  });

  describe('validateInput', () => {
    it('returns null for valid input', () => {
      expect(validateInput('We sell organic dog food delivered to your door')).toBeNull();
    });

    it('returns error for empty input', () => {
      const error = validateInput('');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_INPUT');
    });

    it('returns error for too short input', () => {
      const error = validateInput('Short');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_INPUT');
    });

    it('returns error for too long input', () => {
      const error = validateInput('a'.repeat(1001));
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_INPUT');
    });
  });

  describe('validateTemplate', () => {
    it('returns null for valid templates', () => {
      expect(validateTemplate('saas')).toBeNull();
      expect(validateTemplate('agency')).toBeNull();
      expect(validateTemplate('product')).toBeNull();
      expect(validateTemplate('portfolio')).toBeNull();
      expect(validateTemplate('coming-soon')).toBeNull();
    });

    it('returns error for invalid template', () => {
      const error = validateTemplate('invalid');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('TEMPLATE_NOT_FOUND');
    });
  });

  describe('generatePrompt', () => {
    it('includes business description', () => {
      const prompt = generatePrompt('We sell dog food', 'saas');
      expect(prompt).toContain('We sell dog food');
    });

    it('includes template type', () => {
      const prompt = generatePrompt('We sell dog food', 'agency');
      expect(prompt).toContain('agency');
    });

    it('includes section requirements', () => {
      const prompt = generatePrompt('We sell dog food', 'saas');
      expect(prompt).toContain('Hero section');
      expect(prompt).toContain('Features');
      expect(prompt).toContain('Testimonials');
      expect(prompt).toContain('Call-to-action');
    });
  });

  describe('generateLandingPage', () => {
    it('generates page for valid input', async () => {
      const result = await generateLandingPage({
        description: 'We sell organic dog food delivered to your door',
        template: 'saas',
      });
      
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('metadata');
      if ('html' in result) {
        expect(result.html).toContain('<!DOCTYPE html>');
        expect(result.html).toContain('organic dog food');
      }
    });

    it('returns rate limit error when exceeded', async () => {
      // Exhaust rate limit
      for (let i = 0; i < __testing.RATE_LIMIT; i++) {
        await generateLandingPage({
          description: 'We sell organic dog food delivered to your door',
          template: 'saas',
        });
      }
      
      const result = await generateLandingPage({
        description: 'We sell organic dog food delivered to your door',
        template: 'saas',
      });
      
      expect(result).toHaveProperty('code', 'RATE_LIMIT');
    });

    it('returns validation error for short description', async () => {
      const result = await generateLandingPage({
        description: 'Short',
        template: 'saas',
      });
      
      expect(result).toHaveProperty('code', 'INVALID_INPUT');
    });

    it('returns template error for invalid template', async () => {
      const result = await generateLandingPage({
        description: 'We sell organic dog food delivered to your door',
        template: 'invalid' as any,
      });
      
      expect(result).toHaveProperty('code', 'TEMPLATE_NOT_FOUND');
    });

    it('applies customizations', async () => {
      const result = await generateLandingPage({
        description: 'We sell organic dog food delivered to your door',
        template: 'saas',
        customizations: {
          primaryColor: '#10b981',
        },
      });
      
      if ('html' in result) {
        expect(result.html).toContain('#10b981');
      }
    });
  });
});
