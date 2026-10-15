import { glob } from 'glob';
import { readFile, stat } from 'fs/promises';
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
const IS_GLOB_PATTERN = /[*?{}]/;

/**
 * Fast-path file existence check using direct `stat` call for plain filenames,
 * falling back to `glob` only if wildcard pattern characters are present.
 */
async function checkFileExists(root: string, file: string): Promise<string[]> {
  try {
    if (IS_GLOB_PATTERN.test(file)) {
      return await glob(file, { cwd: root, absolute: false });
    }
    await stat(join(root, file));
    return [file];
  } catch {
    return [];
  }
}

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
    // Collect all unique specific files from framework markers
    const specificFileSet = new Set<string>();
    for (let i = 0; i < FRAMEWORK_MARKERS.length; i++) {
      const files = FRAMEWORK_MARKERS[i].specificFiles;
      for (let j = 0; j < files.length; j++) {
        specificFileSet.add(files[j]);
      }
    }

    // Perform specific file checks, lock file checks, and config reads concurrently via Promise.all
    const [specificResults, lockResults, packageJson, pyprojectToml, composerJson] = await Promise.all([
      Promise.all(Array.from(specificFileSet, file => checkFileExists(this.projectRoot, file))),
      Promise.all(LOCK_FILES.map(file => checkFileExists(this.projectRoot, file))),
      readFile(join(this.projectRoot, 'package.json'), 'utf-8').then(content => {
        try {
          return JSON.parse(content) as Record<string, unknown>;
        } catch {
          return undefined;
        }
      }).catch(() => undefined),
      readFile(join(this.projectRoot, 'pyproject.toml'), 'utf-8').catch(() => undefined),
      readFile(join(this.projectRoot, 'composer.json'), 'utf-8').then(content => {
        try {
          return JSON.parse(content) as Record<string, unknown>;
        } catch {
          return undefined;
        }
      }).catch(() => undefined)
    ]);

    const foundSet = new Set<string>();
    for (let i = 0; i < specificResults.length; i++) {
      const res = specificResults[i];
      for (let j = 0; j < res.length; j++) {
        foundSet.add(res[j]);
      }
    }

    const lockFiles: string[] = [];
    for (let i = 0; i < lockResults.length; i++) {
      const res = lockResults[i];
      for (let j = 0; j < res.length; j++) {
        lockFiles.push(res[j]);
      }
    }

    if (packageJson && !foundSet.has('package.json')) {
      foundSet.add('package.json');
    }
    if (pyprojectToml && !foundSet.has('pyproject.toml')) {
      foundSet.add('pyproject.toml');
    }
    if (composerJson && !foundSet.has('composer.json')) {
      foundSet.add('composer.json');
    }

    return {
      foundFiles: Array.from(foundSet),
      packageJson,
      pyprojectToml,
      composerJson,
      lockFiles
    };
  }

  private analyzeMarkers(markers: {
    foundFiles: string[];
    packageJson?: Record<string, unknown>;
    pyprojectToml?: string;
    composerJson?: Record<string, unknown>;
    lockFiles: string[];
  }): StackProfile {
    let bestMatch: { marker: FrameworkMarker; score: number } | null = null;

    // Pre-merge package.json dependencies once to eliminate redundant object allocations across loops
    const pkgDeps: Record<string, string> | undefined = markers.packageJson
      ? {
          ...(markers.packageJson.dependencies as Record<string, string> || {}),
          ...(markers.packageJson.devDependencies as Record<string, string> || {})
        }
      : undefined;

    for (let i = 0; i < FRAMEWORK_MARKERS.length; i++) {
      const marker = FRAMEWORK_MARKERS[i];
      let score = 0;

      // Check for framework-specific files (high value)
      for (let j = 0; j < marker.specificFiles.length; j++) {
        if (markers.foundFiles.includes(marker.specificFiles[j])) {
          score += 25;
        }
      }

      // Check package.json dependencies (high value)
      if (marker.packageJsonDeps && pkgDeps) {
        const deps = marker.packageJsonDeps;
        for (let j = 0; j < deps.length; j++) {
          if (pkgDeps[deps[j]]) {
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
        hasTailwind: this.checkTailwind(pkgDeps),
        hasDatabase: this.checkDatabase(pkgDeps, markers.pyprojectToml, markers.composerJson),
        database: this.detectDatabase(pkgDeps, markers.pyprojectToml, markers.composerJson),
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
      hasTailwind: this.checkTailwind(pkgDeps),
      hasDatabase: this.checkDatabase(pkgDeps, markers.pyprojectToml, markers.composerJson),
      database: this.detectDatabase(pkgDeps, markers.pyprojectToml, markers.composerJson),
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

  private checkTailwind(pkgDeps?: Record<string, string>): boolean {
    if (!pkgDeps) return false;
    return !!pkgDeps['tailwindcss'] || !!pkgDeps['@tailwindcss/vite'] || !!pkgDeps['@tailwindcss/postcss'];
  }

  private checkDatabase(pkgDeps?: Record<string, string>, pyprojectToml?: string, composerJson?: Record<string, unknown>): boolean {
    if (pkgDeps) {
      const dbDeps = ['pg', 'postgres', 'mysql', 'mysql2', 'sqlite3', 'better-sqlite3', 'mongoose', 'prisma', 'drizzle-orm', 'typeorm', 'sequelize'];
      for (let i = 0; i < dbDeps.length; i++) {
        if (pkgDeps[dbDeps[i]]) return true;
      }
    }
    if (pyprojectToml) {
      const dbDeps = ['sqlalchemy', 'psycopg2', 'asyncpg', 'pymysql', 'sqlite3', 'prisma', 'tortoise-orm'];
      for (let i = 0; i < dbDeps.length; i++) {
        if (pyprojectToml.includes(dbDeps[i])) return true;
      }
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

  private detectDatabase(pkgDeps?: Record<string, string>, pyprojectToml?: string, _composerJson?: Record<string, unknown>): StackProfile['database'] {
    if (pkgDeps) {
      if (pkgDeps['pg'] || pkgDeps['postgres'] || pkgDeps['@neondatabase/serverless']) return 'postgres';
      if (pkgDeps['mysql'] || pkgDeps['mysql2']) return 'mysql';
      if (pkgDeps['better-sqlite3'] || pkgDeps['sqlite3']) return 'sqlite';
      if (pkgDeps['mongoose']) return 'mongodb';
    }
    if (pyprojectToml) {
      if (pyprojectToml.includes('postgresql') || pyprojectToml.includes('psycopg2') || pyprojectToml.includes('asyncpg')) return 'postgres';
      if (pyprojectToml.includes('mysql') || pyprojectToml.includes('pymysql')) return 'mysql';
      if (pyprojectToml.includes('sqlite')) return 'sqlite';
    }
    return undefined;
  }
}