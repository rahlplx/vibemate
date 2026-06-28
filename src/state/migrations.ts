import type { DatabaseConnection } from './connection.js';

const MIGRATIONS = [
  // Migration 1: Create core tables
  `
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT CHECK(type IN ('saas', 'static', 'cli', 'mobile', 'api')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      phase TEXT CHECK(phase IN ('discovery', 'planning', 'building', 'review', 'complete')),
      question_index INTEGER DEFAULT 0,
      answers TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES sessions(id),
      category TEXT,
      question TEXT,
      answer TEXT,
      rationale TEXT,
      hash TEXT NOT NULL,
      previous_hash TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES sessions(id),
      title TEXT,
      description TEXT,
      status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
      complexity_score INTEGER,
      execution_mode TEXT CHECK(execution_mode IN ('inline', 'session', 'subagent')),
      output TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES sessions(id),
      type TEXT CHECK(type IN ('success', 'failure', 'anti-pattern', 'insight')),
      description TEXT,
      lesson TEXT,
      tags TEXT DEFAULT '[]',
      confidence REAL DEFAULT 0.5,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_decisions_session ON decisions(session_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_observations_session ON observations(session_id);
  `,

  // Migration 2: Repo analyses for enterprise repo mining
  `
    CREATE TABLE IF NOT EXISTS repo_analyses (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      cloned_at TEXT NOT NULL,
      languages TEXT NOT NULL,
      folder_structure TEXT,
      commit_count INTEGER NOT NULL DEFAULT 0,
      top_contributors TEXT NOT NULL DEFAULT '[]',
      architecture_patterns TEXT,
      file_count INTEGER NOT NULL DEFAULT 0,
      has_tests INTEGER NOT NULL DEFAULT 0,
      has_ci INTEGER NOT NULL DEFAULT 0,
      package_manager TEXT,
      okf_path TEXT,
      jsonl_path TEXT,
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_repo_analyses_url ON repo_analyses(url);
    CREATE INDEX IF NOT EXISTS idx_repo_analyses_cloned_at ON repo_analyses(cloned_at);
  `,
];

export function runMigrations(conn: DatabaseConnection): void {
  const currentVersion = getMigrationVersion(conn);

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    const migration = MIGRATIONS[i];
    if (!migration) continue;

    conn.db.exec(migration);
    conn.db
      .prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)')
      .run(i + 1, `migration-${i + 1}`);
  }
}

export function getMigrationVersion(conn: DatabaseConnection): number {
  try {
    const result = conn.db
      .prepare('SELECT COALESCE(MAX(version), 0) as v FROM _migrations')
      .get() as { v: number };
    return result.v;
  } catch (error) {
    console.error(`[Migrations] Failed to get migration version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return 0;
  }
}
