import { describe, it, expect } from 'bun:test';
import { StackDetector } from '../../src/mcp/stack-detector.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

async function withTestDir(fn: (dir: string) => Promise<void>) {
  const testDir = join(tmpdir(), `vibemate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });
  try {
    await fn(testDir);
  } finally {
    await rm(testDir, { recursive: true, force: true });
  }
}

describe('StackDetector', () => {
  it('detects Next.js project', async () => {
    await withTestDir(async (testDir) => {
      await writeFile(join(testDir, 'package.json'), JSON.stringify({
        name: 'test-app',
        dependencies: {
          'next': '^14.0.0',
          'react': '^18.0.0',
          'react-dom': '^18.0.0'
        },
        devDependencies: {
          'typescript': '^5.0.0',
          '@types/react': '^18.0.0'
        }
      }, null, 2));
      
      await writeFile(join(testDir, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { target: 'ES2020', module: 'ESNext' }
      }, null, 2));

      await writeFile(join(testDir, 'next.config.js'), 'module.exports = {}');

      const detector = new StackDetector(testDir);
      const profile = await detector.detect();
      
      expect(profile.framework).toBe('nextjs');
      expect(profile.language).toBe('typescript');
      expect(profile.hasTypeScript).toBe(true);
      expect(profile.confidence).toBe('high');
    });
  });

  it('detects Express project', async () => {
    await withTestDir(async (testDir) => {
      await writeFile(join(testDir, 'package.json'), JSON.stringify({
        name: 'api-server',
        dependencies: {
          'express': '^4.18.0'
        },
        devDependencies: {
          'typescript': '^5.0.0',
          '@types/express': '^4.17.0'
        }
      }, null, 2));
      
      await writeFile(join(testDir, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { target: 'ES2020', module: 'CommonJS' }
      }, null, 2));

      const detector = new StackDetector(testDir);
      const profile = await detector.detect();
      
      expect(profile.framework).toBe('express');
      expect(profile.language).toBe('typescript');
      expect(profile.hasTypeScript).toBe(true);
    });
  });

  it('detects FastAPI project', async () => {
    await withTestDir(async (testDir) => {
      await writeFile(join(testDir, 'pyproject.toml'), `
[project]
name = "api"
dependencies = ["fastapi", "uvicorn"]

[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"
      `.trim());

      await writeFile(join(testDir, 'main.py'), `
from fastapi import FastAPI
app = FastAPI()
      `.trim());

      const detector = new StackDetector(testDir);
      const profile = await detector.detect();
      
      expect(profile.framework).toBe('fastapi');
      expect(profile.language).toBe('python');
      expect(profile.packageManager).toBe('pip');
    });
  });

  it('detects Laravel project', async () => {
    await withTestDir(async (testDir) => {
      await writeFile(join(testDir, 'composer.json'), JSON.stringify({
        name: 'laravel/app',
        require: {
          'php': '^8.1',
          'laravel/framework': '^10.0'
        }
      }, null, 2));

      await writeFile(join(testDir, 'artisan'), '#!/usr/bin/env php\n<?php');

      const detector = new StackDetector(testDir);
      const profile = await detector.detect();
      
      expect(profile.framework).toBe('laravel');
      expect(profile.language).toBe('php');
      expect(profile.packageManager).toBe('composer');
    });
  });

  it('falls back to generic for unknown project', async () => {
    await withTestDir(async (testDir) => {
      await writeFile(join(testDir, 'package.json'), JSON.stringify({
        name: 'unknown-project',
        dependencies: {
          'lodash': '^4.17.0'
        }
      }, null, 2));

      const detector = new StackDetector(testDir);
      const profile = await detector.detect();
      
      expect(profile.framework).toBe('generic');
      expect(profile.confidence).toBe('low');
    });
  });

  it('detects TypeScript', async () => {
    await withTestDir(async (testDir) => {
      await writeFile(join(testDir, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { target: 'ES2020' }
      }, null, 2));

      await writeFile(join(testDir, 'package.json'), JSON.stringify({
        name: 'ts-project',
        devDependencies: {
          'typescript': '^5.0.0'
        }
      }, null, 2));

      const detector = new StackDetector(testDir);
      const profile = await detector.detect();
      
      expect(profile.hasTypeScript).toBe(true);
    });
  });

  it('detects Tailwind CSS', async () => {
    await withTestDir(async (testDir) => {
      await writeFile(join(testDir, 'package.json'), JSON.stringify({
        name: 'tailwind-project',
        devDependencies: {
          'tailwindcss': '^3.4.0',
          'typescript': '^5.0.0'
        }
      }, null, 2));

      await writeFile(join(testDir, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { target: 'ES2020' }
      }, null, 2));

      const detector = new StackDetector(testDir);
      const profile = await detector.detect();
      
      expect(profile.hasTailwind).toBe(true);
    });
  });

  it('detects database dependencies', async () => {
    await withTestDir(async (testDir) => {
      await writeFile(join(testDir, 'package.json'), JSON.stringify({
        name: 'db-project',
        dependencies: {
          'pg': '^8.11.0',
          'drizzle-orm': '^0.30.0'
        },
        devDependencies: {
          'typescript': '^5.0.0'
        }
      }, null, 2));

      await writeFile(join(testDir, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { target: 'ES2020' }
      }, null, 2));

      const detector = new StackDetector(testDir);
      const profile = await detector.detect();
      
      console.log('DB test profile:', JSON.stringify(profile, null, 2));
      expect(profile.hasDatabase).toBe(true);
      expect(profile.database).toBe('postgres');
    });
  });

  it('detects package manager from lock files', async () => {
    await withTestDir(async (testDir) => {
      await writeFile(join(testDir, 'package.json'), JSON.stringify({
        name: 'lock-test',
        dependencies: { 'express': '^4.18.0' }
      }, null, 2));

      await writeFile(join(testDir, 'bun.lock'), 'lockfile');
      
      let detector = new StackDetector(testDir);
      let profile = await detector.detect();
      console.log('Bun profile packageManager:', profile.packageManager);
      expect(profile.packageManager).toBe('bun');

      // Test pnpm
      await rm(join(testDir, 'bun.lock'), { force: true });
      await writeFile(join(testDir, 'pnpm-lock.yaml'), 'lockfile');
      detector = new StackDetector(testDir);
      profile = await detector.detect();
      console.log('PNPM profile packageManager:', profile.packageManager);
      expect(profile.packageManager).toBe('pnpm');
    });
  });

  it('returns raw markers found', async () => {
    await withTestDir(async (testDir) => {
      await writeFile(join(testDir, 'package.json'), JSON.stringify({
        name: 'marker-test',
        dependencies: { 'next': '^14.0.0' }
      }, null, 2));
      
      await writeFile(join(testDir, 'tsconfig.json'), JSON.stringify({}, null, 2));

      const detector = new StackDetector(testDir);
      const profile = await detector.detect();
      
      expect(profile.rawMarkers).toContain('package.json');
      expect(profile.rawMarkers).toContain('tsconfig.json');
    });
  });
});
