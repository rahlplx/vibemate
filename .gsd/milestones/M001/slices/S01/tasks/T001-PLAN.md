# T001: Initialize Bun/TypeScript Project with MCP SDK

## Plan
Create a new Bun/TypeScript project in `src/mcp/` with the MCP SDK as dependency.

## Files to Create
```
src/mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Entry point
│   ├── server.ts          # MCP server implementation
│   ├── tools/
│   │   ├── index.ts       # Tool registry
│   │   └── spec.ts        # vibemate_spec tool definition
│   └── types.ts           # Shared types
└── tests/
    ├── server.test.ts
    └── tools.test.ts
```

## package.json
```json
{
  "name": "@vibemate/mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": { "vibemate-mcp": "./dist/index.js" },
  "scripts": {
    "build": "bun build src/index.ts --outdir ./dist --target bun",
    "dev": "bun --watch src/index.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bun": "^1.3.0",
    "typescript": "^5.5.0"
  }
}
```

## tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Must-Haves
- [ ] Package builds with `bun run build`
- [ ] TypeScript strict mode passes
- [ ] MCP SDK imports without errors
- [ ] Binary entry point works: `node dist/index.js`

## Verification
```bash
cd src/mcp && bun run build && node dist/index.js --help
```