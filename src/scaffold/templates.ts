export interface TemplateFile {
  path: string;
  content: string;
}

export interface ScaffoldTemplate {
  name: string;
  description: string;
  files: TemplateFile[];
  variables: string[];
}

const TEMPLATES: Record<string, ScaffoldTemplate> = {
  default: {
    name: 'default',
    description: 'Basic project structure',
    variables: ['projectName', 'description'],
    files: [
      {
        path: 'package.json',
        content: `{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "type": "module",
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun run src/index.ts",
    "test": "vitest run",
    "lint": "eslint src/"
  },
  "dependencies": {},
  "devDependencies": {
    "vitest": "^3.2.1",
    "@types/bun": "latest"
  }
}`,
      },
      {
        path: 'tsconfig.json',
        content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}`,
      },
      {
        path: 'src/index.ts',
        content: `export function main() {
  console.log("Hello from {{projectName}}!");
}

main();`,
      },
    ],
  },
  api: {
    name: 'api',
    description: 'REST API with Hono',
    variables: ['projectName', 'description'],
    files: [
      {
        path: 'package.json',
        content: `{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "type": "module",
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir dist",
    "test": "vitest run"
  },
  "dependencies": {
    "hono": "^4.7"
  },
  "devDependencies": {
    "vitest": "^3.2.1",
    "@types/bun": "latest"
  }
}`,
      },
      {
        path: 'src/index.ts',
        content: `import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.json({ message: "Hello from {{projectName}}" }));

export default {
  port: 3000,
  fetch: app.fetch,
};`,
      },
    ],
  },
  cli: {
    name: 'cli',
    description: 'CLI tool with Commander',
    variables: ['projectName', 'description'],
    files: [
      {
        path: 'package.json',
        content: `{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "type": "module",
  "bin": {
    "{{projectName}}": "dist/index.js"
  },
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target node",
    "test": "vitest run"
  },
  "dependencies": {
    "commander": "^12.1"
  },
  "devDependencies": {
    "vitest": "^3.2.1",
    "@types/bun": "latest",
    "@types/commander": "latest"
  }
}`,
      },
      {
        path: 'src/index.ts',
        content: `import { Command } from "commander";

const program = new Command();

program
  .name("{{projectName}}")
  .description("{{description}}")
  .version("0.1.0");

program
  .command("hello")
  .description("Say hello")
  .action(() => {
    console.log("Hello from {{projectName}}!");
  });

program.parse();`,
      },
    ],
  },
};

export function getTemplateNames(): string[] {
  return Object.keys(TEMPLATES);
}

export function getTemplate(name: string): ScaffoldTemplate | undefined {
  return TEMPLATES[name];
}

export function renderTemplate(
  template: ScaffoldTemplate,
  variables: Record<string, string>
): TemplateFile[] {
  return template.files.map((file) => ({
    path: file.path,
    content: template.variables.reduce(
      (content, varName) =>
        content.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), variables[varName] ?? ''),
      file.content
    ),
  }));
}
