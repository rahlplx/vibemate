# Example: Scaffold Generator

This example shows how to use the Scaffold Generator for project scaffolding.

## Usage

```typescript
import { ScaffoldGenerator } from '@vibemate/core/scaffold';

async function main() {
  // Create scaffold generator
  const generator = new ScaffoldGenerator();

  // List available templates
  const templates = generator.listTemplates();
  console.log('Available templates:', templates.map(t => t.name));

  // Generate a SaaS project
  console.log('Generating SaaS project...');
  const result = await generator.generate({
    template: 'saas',
    variables: {
      projectName: 'my-saas-app',
      description: 'My SaaS application',
      author: 'John Doe',
      database: 'postgresql',
      auth: 'oauth',
      billing: 'stripe'
    },
    outputDir: './my-saas-app'
  });

  console.log('Generated files:', result.files);

  // Generate an API project
  console.log('Generating API project...');
  const apiResult = await generator.generate({
    template: 'api',
    variables: {
      projectName: 'my-api',
      description: 'My REST API',
      author: 'John Doe',
      database: 'sqlite',
      auth: 'jwt'
    },
    outputDir: './my-api'
  });

  console.log('Generated files:', apiResult.files);

  // Generate a CLI project
  console.log('Generating CLI project...');
  const cliResult = await generator.generate({
    template: 'cli',
    variables: {
      projectName: 'my-cli',
      description: 'My CLI tool',
      author: 'John Doe'
    },
    outputDir: './my-cli'
  });

  console.log('Generated files:', cliResult.files);
}

main().catch(console.error);
```

## Output

```
Available templates: ['saas', 'api', 'cli']
Generating SaaS project...
Generated files: [
  'package.json',
  'tsconfig.json',
  'src/index.ts',
  'src/routes/auth.ts',
  'src/routes/billing.ts',
  'src/middleware/auth.ts',
  'src/database/schema.sql',
  '.env.example',
  'README.md'
]
Generating API project...
Generated files: [
  'package.json',
  'tsconfig.json',
  'src/index.ts',
  'src/routes/index.ts',
  'src/middleware/auth.ts',
  'src/database/schema.sql',
  '.env.example',
  'README.md'
]
Generating CLI project...
Generated files: [
  'package.json',
  'tsconfig.json',
  'src/index.ts',
  'src/commands/index.ts',
  'README.md'
]
```
