// PageForge — AI Generation Pipeline

export interface GenerationRequest {
  description: string;
  template: 'saas' | 'agency' | 'product' | 'portfolio' | 'coming-soon';
  customizations?: {
    primaryColor?: string;
    fontFamily?: string;
  };
}

export interface GenerationResponse {
  html: string;
  metadata: {
    title: string;
    description: string;
    ogImage: string;
  };
}

export interface GenerationError {
  code: 'RATE_LIMIT' | 'API_ERROR' | 'INVALID_INPUT' | 'TEMPLATE_NOT_FOUND';
  message: string;
}

// Rate limiter
const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT = 10; // requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms

export function checkRateLimit(userId: string = 'default'): boolean {
  const now = Date.now();
  const timestamps = rateLimiter.get(userId) || [];
  
  // Remove old timestamps
  const validTimestamps = timestamps.filter(t => now - t < RATE_WINDOW);
  
  if (validTimestamps.length >= RATE_LIMIT) {
    return false;
  }
  
  validTimestamps.push(now);
  rateLimiter.set(userId, validTimestamps);
  return true;
}

// Input validation
export function validateInput(description: string): GenerationError | null {
  if (!description || description.trim().length === 0) {
    return { code: 'INVALID_INPUT', message: 'Description is required' };
  }
  
  if (description.trim().length < 20) {
    return { code: 'INVALID_INPUT', message: 'Description must be at least 20 characters' };
  }
  
  if (description.trim().length > 1000) {
    return { code: 'INVALID_INPUT', message: 'Description must be less than 1000 characters' };
  }
  
  return null;
}

// Template validation
const VALID_TEMPLATES = ['saas', 'agency', 'product', 'portfolio', 'coming-soon'];

export function validateTemplate(template: string): GenerationError | null {
  if (!VALID_TEMPLATES.includes(template)) {
    return { code: 'TEMPLATE_NOT_FOUND', message: `Invalid template: ${template}` };
  }
  return null;
}

// Generate prompt for OpenAI
export function generatePrompt(description: string, template: string): string {
  return `You are a professional copywriter and web designer. Generate a complete, modern landing page for the following business:

Business Description: ${description}

Template Style: ${template}

Requirements:
1. Create a complete HTML page with inline CSS (no external files)
2. Use a modern, clean design with good typography
3. Include these sections:
   - Hero section with compelling headline and subheadline
   - Features/benefits grid (3-4 items)
   - Testimonials section (2-3 testimonials)
   - Call-to-action section
   - Footer with basic links
4. Use responsive design (mobile-friendly)
5. Use modern CSS (flexbox, grid, variables)
6. Make it visually appealing with good spacing and colors

Output ONLY the complete HTML code, no explanations or markdown formatting.`;
}

// Main generation function (mock for now, would call OpenAI in production)
export async function generateLandingPage(
  request: GenerationRequest
): Promise<GenerationResponse | GenerationError> {
  // Check rate limit
  if (!checkRateLimit()) {
    return { code: 'RATE_LIMIT', message: 'Rate limit exceeded. Try again later.' };
  }
  
  // Validate input
  const inputError = validateInput(request.description);
  if (inputError) return inputError;
  
  // Validate template
  const templateError = validateTemplate(request.template);
  if (templateError) return templateError;
  
  // In production, this would call OpenAI API
  // For now, return a mock response
  const mockHtml = generateMockHtml(request);
  
  return {
    html: mockHtml,
    metadata: {
      title: request.description.split(' ').slice(0, 5).join(' ') + '...',
      description: request.description.substring(0, 160),
      ogImage: '/og-image.png',
    },
  };
}

// Mock HTML generator
function generateMockHtml(request: GenerationRequest): string {
  const { description, template, customizations } = request;
  const primaryColor = customizations?.primaryColor || '#6366f1';
  
  // Extract key phrases from description
  const words = description.split(' ').slice(0, 3).join(' ');
  const headline = `${words.charAt(0).toUpperCase() + words.slice(1)} - Landing Page`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
  <style>
    :root {
      --primary: ${primaryColor};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
    
    /* Hero */
    .hero { background: linear-gradient(135deg, var(--primary), #4f46e5); color: white; padding: 100px 20px; text-align: center; }
    .hero h1 { font-size: 3rem; margin-bottom: 20px; }
    .hero p { font-size: 1.25rem; opacity: 0.9; max-width: 600px; margin: 0 auto 30px; }
    .cta-btn { background: white; color: var(--primary); padding: 15px 40px; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: 600; cursor: pointer; }
    
    /* Features */
    .features { padding: 80px 20px; text-align: center; }
    .features h2 { font-size: 2rem; margin-bottom: 40px; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px; }
    .feature-card { padding: 30px; border-radius: 12px; background: #f8fafc; }
    .feature-icon { font-size: 2.5rem; margin-bottom: 15px; }
    
    /* Testimonials */
    .testimonials { background: #f1f5f9; padding: 80px 20px; }
    .testimonials h2 { text-align: center; margin-bottom: 40px; }
    .testimonial-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
    .testimonial-card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .testimonial-text { font-style: italic; margin-bottom: 20px; }
    .testimonial-author { font-weight: 600; }
    
    /* CTA Section */
    .cta-section { background: var(--primary); color: white; padding: 80px 20px; text-align: center; }
    .cta-section h2 { margin-bottom: 20px; }
    .cta-section .cta-btn { background: white; color: var(--primary); }
    
    /* Footer */
    .footer { background: #1e293b; color: white; padding: 40px 20px; text-align: center; }
    
    @media (max-width: 768px) {
      .hero h1 { font-size: 2rem; }
    }
  </style>
</head>
<body>
  <section class="hero">
    <div class="container">
      <h1>${headline}</h1>
      <p>${description}</p>
      <button class="cta-btn">Get Started</button>
    </div>
  </section>
  
  <section class="features">
    <div class="container">
      <h2>Why Choose Us</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>Fast</h3>
          <p>Lightning-fast performance for the best experience</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h3>Secure</h3>
          <p>Enterprise-grade security for your peace of mind</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">💰</div>
          <h3>Affordable</h3>
          <p>Great value without compromising quality</p>
        </div>
      </div>
    </div>
  </section>
  
  <section class="testimonials">
    <div class="container">
      <h2>What Our Customers Say</h2>
      <div class="testimonial-grid">
        <div class="testimonial-card">
          <p class="testimonial-text">"This product changed my life! Highly recommended."</p>
          <p class="testimonial-author">— Sarah Johnson</p>
        </div>
        <div class="testimonial-card">
          <p class="testimonial-text">"Best investment I've made this year. Amazing quality."</p>
          <p class="testimonial-author">— Mike Chen</p>
        </div>
      </div>
    </div>
  </section>
  
  <section class="cta-section">
    <div class="container">
      <h2>Ready to Get Started?</h2>
      <p>Join thousands of satisfied customers today.</p>
      <button class="cta-btn">Start Free Trial</button>
    </div>
  </section>
  
  <footer class="footer">
    <div class="container">
      <p>&copy; 2026 ${words}. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`;
}

// Export for testing
export const __testing = {
  rateLimiter,
  RATE_LIMIT,
  RATE_WINDOW,
};
