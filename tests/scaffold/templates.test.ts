import { describe, it, expect } from 'bun:test';
import {
  getTemplate,
  getTemplateNames,
  renderTemplate,
  type ScaffoldTemplate,
} from '../../src/scaffold/templates.js';

describe('ScaffoldTemplates', () => {
  describe('getTemplateNames', () => {
    it('returns available template names', () => {
      const names = getTemplateNames();
      expect(names.length).toBeGreaterThan(0);
      expect(names).toContain('default');
    });
  });

  describe('getTemplate', () => {
    it('returns a template by name', () => {
      const template = getTemplate('default');
      expect(template).toBeDefined();
      expect(template!.name).toBe('default');
      expect(template!.files.length).toBeGreaterThan(0);
    });

    it('returns undefined for unknown template', () => {
      const template = getTemplate('nonexistent');
      expect(template).toBeUndefined();
    });
  });

  describe('renderTemplate', () => {
    it('renders template files with variables', () => {
      const template = getTemplate('default')!;
      const rendered = renderTemplate(template, {
        projectName: 'my-app',
        description: 'A cool app',
      });
      expect(rendered.length).toBeGreaterThan(0);
      expect(rendered[0].content).toContain('my-app');
    });

    it('preserves file paths', () => {
      const template = getTemplate('default')!;
      const rendered = renderTemplate(template, {
        projectName: 'my-app',
        description: 'Test',
      });
      expect(rendered[0].path).toBeTruthy();
    });

    it('sanitizes path segments to prevent injection', () => {
      const template: ScaffoldTemplate = {
        name: 'test',
        description: 'test',
        variables: ['projectName'],
        files: [{ path: '{{projectName}}/index.ts', content: 'const x = 1;' }],
      };
      const rendered = renderTemplate(template, {
        projectName: '../evil',
      });
      expect(rendered[0].path).not.toContain('..');
    });

    it('sanitizes dangerous characters in file paths', () => {
      const template: ScaffoldTemplate = {
        name: 'test',
        description: 'test',
        variables: ['projectName'],
        files: [{ path: '{{projectName}}.ts', content: 'const x = 1;' }],
      };
      const rendered = renderTemplate(template, {
        projectName: 'my<app>',
      });
      expect(rendered[0].path).not.toContain('<');
      expect(rendered[0].path).not.toContain('>');
    });

    it('does not sanitize content (only paths)', () => {
      const template: ScaffoldTemplate = {
        name: 'test',
        description: 'test',
        variables: ['projectName'],
        files: [{ path: 'index.ts', content: 'console.log("{{projectName}}")' }],
      };
      const rendered = renderTemplate(template, {
        projectName: 'my-app',
      });
      expect(rendered[0].content).toContain('my-app');
    });
  });
});
