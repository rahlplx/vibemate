// PageForge — HTML Templates

export interface Template {
  id: string;
  name: string;
  description: string;
  sections: string[];
}

export const templates: Template[] = [
  {
    id: 'saas',
    name: 'SaaS',
    description: 'Perfect for software products and subscriptions',
    sections: ['hero', 'features', 'pricing', 'testimonials', 'cta', 'footer'],
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'Ideal for service businesses and consultants',
    sections: ['hero', 'services', 'portfolio', 'testimonials', 'cta', 'footer'],
  },
  {
    id: 'product',
    name: 'Product',
    description: 'Great for physical products and e-commerce',
    sections: ['hero', 'product-showcase', 'features', 'reviews', 'cta', 'footer'],
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Showcase your work and creative projects',
    sections: ['hero', 'work', 'about', 'skills', 'contact', 'footer'],
  },
  {
    id: 'coming-soon',
    name: 'Coming Soon',
    description: 'Build anticipation before your launch',
    sections: ['hero', 'countdown', 'features-preview', 'email-signup', 'footer'],
  },
];

export function getTemplate(id: string): Template | undefined {
  return templates.find(t => t.id === id);
}

export function getTemplates(): Template[] {
  return templates;
}
