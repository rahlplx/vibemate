import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { StackProfile } from './types.js';

export type { StackProfile } from './types.js';

interface FrameworkMarker {
  framework: StackProfile['framework'];
  language: StackProfile['language'];
  packageManager: StackProfile['packageManager'];
  specificFiles: string[];
  packageJsonDeps?: string[];
}

const FRAMEWORK_MARKERS: FrameworkMarker[] = [
  {
    framework: 'nextjs',
    language: 'typescript',
    packageManager: 'bun',
    specificFiles: ['tsconfig.json', 'next.config.js', 'next.config.ts'],
    packageJsonDeps: ['next', 'react', 'react-dom']
  },
  {
    framework: 'express',
    language: 'typescript',
    packageManager: 'bun',
    specificFiles: ['tsconfig.json'],
    packageJsonDeps: ['express']
  },
  {
    framework: 'fastapi',
    language: 'python',
    packageManager: 'pip',
    specificFiles: ['pyproject.toml', 'requirements.txt', 'main.py', 'app.py'],
    packageJsonDeps: ['fastapi']
  },
  {
    framework: 'laravel',
    language: 'php',
    packageManager: 'composer',
    specificFiles: ['composer.json', 'artisan'],
    packageJsonDeps: ['laravel/framework']
  }
];

const LOCK_FILES = ['bun.lock', 'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json'];

export class StackDetector {
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  setProjectRoot(root: string): void {
    this.projectRoot = root;
  }

  async detect(): Promise<StackProfile> {
    const markers = await this.scanForMarkers();
    const profile = this.analyzeMarkers(markers);
    return profile;
  }

  private async scanForMarkers(): Promise<{
    foundFiles: string[];
    packageJson?: Record<string, unknown>;
    pyprojectToml?: string;
    composerJson?: Record<string, unknown>;
    lockFiles: string[];
  }> {
    const foundFiles: string[] = [];
    let packageJson: Record<string, unknown> | undefined;
    let pyprojectToml: string | undefined;
    let composerJson: Record<string, unknown> | undefined;
    const lockFiles: string[] = [];

    // Scan for framework-specific files
    for (const marker of FRAMEWORK_MARKERS) {
      for (const file of marker.specificFiles) {
        try {
          const files = await glob(file, { cwd: this.projectRoot, absolute: false });
          for (const f of files) {
            if (!foundFiles.includes(f)) {
              foundFiles.push(f);
            }
          }
        } catch (error) {
          console.error(`[StackDetector] Failed to scan for ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Check for lock files
    for (const lockFile of LOCK_FILES) {
      try {
        const files = await glob(lockFile, { cwd: this.projectRoot, absolute: false });
        for (const f of files) {
          if (!lockFiles.includes(f)) {
            lockFiles.push(f);
          }
        }
      } catch (error) {
        console.error(`[StackDetector] Failed to scan for lock file ${lockFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Read package.json
    try {
      const content = await readFile(join(this.projectRoot, 'package.json'), 'utf-8');
      packageJson = JSON.parse(content);
      if (!foundFiles.includes('package.json')) {
        foundFiles.push('package.json');
      }
    } catch (error) {
      console.error(`[StackDetector] Failed to read package.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Read pyproject.toml
    try {
      pyprojectToml = await readFile(join(this.projectRoot, 'pyproject.toml'), 'utf-8');
      if (!foundFiles.includes('pyproject.toml')) {
        foundFiles.push('pyproject.toml');
      }
    } catch (error) {
      console.error(`[StackDetector] Failed to read pyproject.toml: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Read composer.json
    try {
      const content = await readFile(join(this.projectRoot, 'composer.json'), 'utf-8');
      composerJson = JSON.parse(content);
      if (!foundFiles.includes('composer.json')) {
        foundFiles.push('composer.json');
      }
    } catch (error) {
      console.error(`[StackDetector] Failed to read composer.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { foundFiles, packageJson, pyprojectToml, composerJson, lockFiles };
  }

  private analyzeMarkers(markers: {
    foundFiles: string[];
    packageJson?: Record<string, unknown>;
    pyprojectToml?: string;
    composerJson?: Record<string, unknown>;
    lockFiles: string[];
  }): StackProfile {
    let bestMatch: { marker: FrameworkMarker; score: number } | null = null;

    for (const marker of FRAMEWORK_MARKERS) {
      let score = 0;
      const deps = marker.packageJsonDeps || [];

      // Check for framework-specific files (high value)
      for (const file of marker.specificFiles) {
        if (markers.foundFiles.includes(file)) {
          score += 25;
        }
      }

      // Check package.json dependencies (high value)
      if (marker.packageJsonDeps && markers.packageJson) {
        const pkgDeps = {
          ...(markers.packageJson.dependencies as Record<string, string> || {}),
          ...(markers.packageJson.devDependencies as Record<string, string> || {})
        };
        for (const dep of deps) {
          if (pkgDeps[dep]) {
            score += 30;
          }
        }
      }

      // Check pyproject.toml for fastapi
      if (marker.framework === 'fastapi' && markers.pyprojectToml) {
        if (markers.pyprojectToml.includes('fastapi')) {
          score += 30;
        }
      }

      // Check composer.json for laravel
      if (marker.framework === 'laravel' && markers.composerJson) {
        const req = {
          ...(markers.composerJson.require as Record<string, string> || {}),
          ...(markers.composerJson['require-dev'] as Record<string, string> || {})
        };
        if (req['laravel/framework']) {
          score += 30;
        }
      }

      // Require minimum score of 30 to consider a framework match
      if (score >= 30 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { marker, score };
      }
    }

    if (bestMatch) {
      const { marker, score } = bestMatch;
      return {
        framework: marker.framework,
        language: marker.language,
        packageManager: this.detectPackageManager(marker.packageManager, markers.lockFiles),
        hasTypeScript: markers.foundFiles.includes('tsconfig.json'),
        hasTailwind: this.checkTailwind(markers.packageJson),
        hasDatabase: this.checkDatabase(markers.packageJson, markers.pyprojectToml, markers.composerJson),
        database: this.detectDatabase(markers.packageJson, markers.pyprojectToml, markers.composerJson),
        confidence: score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low',
        rawMarkers: markers.foundFiles
      };
    }

    // Generic fallback
    return {
      framework: 'generic',
      language: markers.foundFiles.includes('tsconfig.json') ? 'typescript' : 'javascript',
      packageManager: this.detectPackageManager('npm', markers.lockFiles),
      hasTypeScript: markers.foundFiles.includes('tsconfig.json'),
      hasTailwind: this.checkTailwind(markers.packageJson),
      hasDatabase: this.checkDatabase(markers.packageJson, markers.pyprojectToml, markers.composerJson),
      database: this.detectDatabase(markers.packageJson, markers.pyprojectToml, markers.composerJson),
      confidence: 'low',
      rawMarkers: markers.foundFiles
    };
  }

  private detectPackageManager(defaultPm: StackProfile['packageManager'], lockFiles: string[]): StackProfile['packageManager'] {
    if (lockFiles.includes('bun.lock')) return 'bun';
    if (lockFiles.includes('pnpm-lock.yaml')) return 'pnpm';
    if (lockFiles.includes('yarn.lock')) return 'yarn';
    if (lockFiles.includes('package-lock.json')) return 'npm';
    return defaultPm;
  }

  private checkTailwind(packageJson?: Record<string, unknown>): boolean {
    if (!packageJson) return false;
    const deps = {
      ...(packageJson.dependencies as Record<string, string> || {}),
      ...(packageJson.devDependencies as Record<string, string> || {})
    };
    return !!deps['tailwindcss'] || !!deps['@tailwindcss/vite'] || !!deps['@tailwindcss/postcss'];
  }

  private checkDatabase(packageJson?: Record<string, unknown>, pyprojectToml?: string, composerJson?: Record<string, unknown>): boolean {
    if (packageJson) {
      const deps = {
        ...(packageJson.dependencies as Record<string, string> || {}),
        ...(packageJson.devDependencies as Record<string, string> || {})
      };
      const dbDeps = ['pg', 'postgres', 'mysql', 'mysql2', 'sqlite3', 'better-sqlite3', 'mongoose', 'prisma', 'drizzle-orm', 'typeorm', 'sequelize'];
      if (dbDeps.some(d => deps[d])) return true;
    }
    if (pyprojectToml) {
      const dbDeps = ['sqlalchemy', 'psycopg2', 'asyncpg', 'pymysql', 'sqlite3', 'prisma', 'tortoise-orm'];
      if (dbDeps.some(d => pyprojectToml.includes(d))) return true;
    }
    if (composerJson) {
      const req = {
        ...(composerJson.require as Record<string, string> || {}),
        ...(composerJson['require-dev'] as Record<string, string> || {})
      };
      const dbDeps = ['doctrine/orm', 'illuminate/database', 'laravel/sanctum'];
      if (Object.keys(req).some(d => dbDeps.some(db => d.includes(db)))) return true;
    }
    return false;
  }

  private detectDatabase(packageJson?: Record<string, unknown>, pyprojectToml?: string, _composerJson?: Record<string, unknown>): StackProfile['database'] {
    if (packageJson) {
      const deps = {
        ...(packageJson.dependencies as Record<string, string> || {}),
        ...(packageJson.devDependencies as Record<string, string> || {})
      };
      if (deps['pg'] || deps['postgres'] || deps['@neondatabase/serverless']) return 'postgres';
      if (deps['mysql'] || deps['mysql2']) return 'mysql';
      if (deps['better-sqlite3'] || deps['sqlite3']) return 'sqlite';
      if (deps['mongoose']) return 'mongodb';
    }
    if (pyprojectToml) {
      if (pyprojectToml.includes('postgresql') || pyprojectToml.includes('psycopg2') || pyprojectToml.includes('asyncpg')) return 'postgres';
      if (pyprojectToml.includes('mysql') || pyprojectToml.includes('pymysql')) return 'mysql';
      if (pyprojectToml.includes('sqlite')) return 'sqlite';
    }
    return undefined;
  }
}