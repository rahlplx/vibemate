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
  auth: {
    name: 'auth',
    description: 'Authentication with JWT, signup, login, rate limiting, RBAC',
    variables: ['projectName', 'description'],
    files: [
      {
        path: 'src/auth/signup.ts',
        content: `import { hash } from "bcryptjs";
import { sign } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not set");

interface SignupInput {
  email: string;
  password: string;
  name: string;
}

export async function signup(input: SignupInput) {
  const hashedPassword = await hash(input.password, 12);
  const user = {
    id: crypto.randomUUID(),
    email: input.email,
    name: input.name,
    password: hashedPassword,
    role: "user" as const,
    createdAt: new Date(),
  };
  // TODO: Persist user to database
  const token = sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token };
}`,
      },
      {
        path: 'src/auth/login.ts',
        content: `import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not set");

interface LoginInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput) {
  // TODO: Fetch user from database by email
  const user = { id: "", password: "", role: "user" as const, email: input.email, name: "" };
  if (!user) {
    throw new Error("Invalid credentials");
  }
  const valid = await compare(input.password, user.password);
  if (!valid) {
    throw new Error("Invalid credentials");
  }
  const token = sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token };
}`,
      },
      {
        path: 'src/auth/middleware.ts',
        content: `import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not set");

interface AuthRequest {
  headers: { authorization?: string };
}

export function authenticate(req: AuthRequest) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }
  const token = header.slice(7);
  try {
    const payload = verify(token, JWT_SECRET) as { sub: string; role: string };
    return { userId: payload.sub, role: payload.role };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

export function requireRole(role: string) {
  return (req: AuthRequest) => {
    const auth = authenticate(req);
    if (auth.role !== role && auth.role !== "admin") {
      throw new Error("Insufficient permissions");
    }
    return auth;
  };
}`,
      },
      {
        path: 'src/auth/rate-limit.ts',
        content: `const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }
  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }
  record.count++;
  return { allowed: true, remaining: maxAttempts - record.count };
}`,
      },
      {
        path: 'src/auth/index.ts',
        content: `export { signup } from "./signup.js";
export { login } from "./login.js";
export { authenticate, requireRole } from "./middleware.js";
export { checkRateLimit } from "./rate-limit.js";`,
      },
      {
        path: 'migrations/001_create_users.sql',
        content: `CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);`,
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

/**
 * Renders a scaffold template by performing variable substitution on file paths and contents.
 *
 * Performance optimization:
 * - Pre-computes variable placeholders, raw values, and sanitized values outside the file loop
 * - Uses `.includes('{{')` guard checks to skip variable scanning on files without template placeholders
 * - Uses `String.prototype.replaceAll` literal string substitution to eliminate dynamic RegExp compilation
 */
export function renderTemplate(
  template: ScaffoldTemplate,
  variables: Record<string, string>
): TemplateFile[] {
  const varKeys = template.variables;
  const numVars = varKeys.length;
  if (numVars === 0) {
    return template.files.map((f) => ({ path: f.path, content: f.content }));
  }

  // Pre-compute variable placeholders and values once per template render call
  const preparedVars = new Array<{ placeholder: string; val: string; sanitizedVal: string }>(numVars);
  for (let i = 0; i < numVars; i++) {
    const varName = varKeys[i];
    const rawVal = variables[varName] ?? '';
    preparedVars[i] = {
      placeholder: `{{${varName}}}`,
      val: rawVal,
      sanitizedVal: sanitizePathSegment(rawVal),
    };
  }

  const files = template.files;
  const fileCount = files.length;
  const result: TemplateFile[] = new Array(fileCount);

  for (let i = 0; i < fileCount; i++) {
    const file = files[i];
    let path = file.path;
    let content = file.content;

    // Fast-path: check if path contains template syntax before processing replacements
    if (path.includes('{{')) {
      for (let j = 0; j < numVars; j++) {
        const v = preparedVars[j];
        if (path.includes(v.placeholder)) {
          path = path.replaceAll(v.placeholder, v.sanitizedVal);
        }
      }
    }

    // Fast-path: check if content contains template syntax before processing replacements
    if (content.includes('{{')) {
      for (let j = 0; j < numVars; j++) {
        const v = preparedVars[j];
        if (content.includes(v.placeholder)) {
          content = content.replaceAll(v.placeholder, v.val);
        }
      }
    }

    result[i] = { path, content };
  }

  return result;
}

function sanitizePathSegment(value: string): string {
  return value
    .replace(/^(\.\.[\\/]?|\.\b)+/, '')
    .replace(/[<>:"/\\|?*]/g, '_');
}
