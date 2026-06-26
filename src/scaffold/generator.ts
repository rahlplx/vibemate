import { getTemplate, renderTemplate, getTemplateNames } from './templates.js';
import { writeFiles } from './file-writer.js';

export interface ScaffoldGenerator {
  generate(
    targetDir: string,
    templateName: string,
    variables: Record<string, string>
  ): string[];
  getAvailableTemplates(): string[];
}

export function createScaffoldGenerator(): ScaffoldGenerator {
  return {
    generate(targetDir, templateName, variables) {
      const template = getTemplate(templateName);
      if (!template) {
        throw new Error(`Template "${templateName}" not found`);
      }

      const files = renderTemplate(template, variables);
      writeFiles(targetDir, files);
      return files.map((f) => f.path);
    },

    getAvailableTemplates() {
      return getTemplateNames();
    },
  };
}
