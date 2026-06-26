import type { DatabaseConnection } from './connection.js';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  project_id: string;
  phase: string;
  question_index: number;
  answers: string;
  created_at: string;
  completed_at: string | null;
}

export interface Decision {
  id: string;
  sessionId: string;
  category: string;
  question: string;
  answer: string;
  rationale: string;
  hash: string;
  previousHash: string | null;
  createdAt: string;
}

export interface Task {
  id: string;
  session_id: string;
  title: string;
  description: string;
  status: string;
  complexity_score: number;
  execution_mode: string;
  output: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Observation {
  id: string;
  session_id: string;
  type: string;
  description: string;
  lesson: string;
  tags: string;
  confidence: number;
  created_at: string;
}

export interface StateStore {
  // Project operations
  createProject(data: { id: string; name: string; description?: string; type: string }): Project;
  getProject(id: string): Project | undefined;
  listProjects(): Project[];
  updateProject(id: string, patch: Partial<Pick<Project, 'name' | 'description' | 'type'>>): void;
  deleteProject(id: string): void;

  // Session operations
  createSession(data: { id: string; projectId: string; phase: string }): Session;
  getSession(id: string): Session | undefined;
  listSessions(projectId: string): Session[];
  updateSessionAnswers(id: string, answers: { questionId: string; value: unknown; timestamp: string }[]): void;
  completeSession(id: string): void;

  // Decision operations
  createDecision(data: {
    id: string;
    sessionId: string;
    category: string;
    question: string;
    answer: string;
    rationale: string;
    hash: string;
    previousHash?: string;
  }): Decision;
  listDecisions(sessionId: string): Decision[];

  // Task operations
  createTask(data: {
    id: string;
    sessionId: string;
    title: string;
    description: string;
    status: string;
    complexityScore: number;
    executionMode: string;
  }): Task;
  getTask(id: string): Task | undefined;
  listTasksByStatus(sessionId: string, status: string): Task[];
  updateTask(id: string, patch: Partial<Pick<Task, 'status' | 'output' | 'completed_at'>>): void;

  // Observation operations
  createObservation(data: {
    id: string;
    sessionId: string;
    type: string;
    description: string;
    lesson: string;
    tags: string[];
    confidence: number;
  }): Observation;
  listObservations(sessionId: string): Observation[];
}

export function createStore(conn: DatabaseConnection): StateStore {
  const { db } = conn;

  return {
    // Project operations
    createProject(data) {
      const stmt = db.prepare(
        'INSERT INTO projects (id, name, description, type) VALUES (?, ?, ?, ?)'
      );
      stmt.run(data.id, data.name, data.description ?? null, data.type);
      return db.prepare('SELECT * FROM projects WHERE id = ?').get(data.id) as Project;
    },

    getProject(id) {
      return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
    },

    listProjects() {
      return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Project[];
    },

    updateProject(id, patch) {
      const sets: string[] = [];
      const values: unknown[] = [];
      if (patch.name !== undefined) { sets.push('name = ?'); values.push(patch.name); }
      if (patch.description !== undefined) { sets.push('description = ?'); values.push(patch.description); }
      if (patch.type !== undefined) { sets.push('type = ?'); values.push(patch.type); }
      if (sets.length === 0) return;
      sets.push("updated_at = datetime('now')");
      values.push(id);
      db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    },

    deleteProject(id) {
      db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    },

    // Session operations
    createSession(data) {
      db.prepare(
        'INSERT INTO sessions (id, project_id, phase) VALUES (?, ?, ?)'
      ).run(data.id, data.projectId, data.phase);
      return db.prepare('SELECT * FROM sessions WHERE id = ?').get(data.id) as Session;
    },

    getSession(id) {
      return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined;
    },

    listSessions(projectId) {
      return db.prepare(
        'SELECT * FROM sessions WHERE project_id = ? ORDER BY created_at DESC'
      ).all(projectId) as Session[];
    },

    updateSessionAnswers(id, answers) {
      db.prepare('UPDATE sessions SET answers = ? WHERE id = ?').run(
        JSON.stringify(answers.map((a) => ({ questionId: a.questionId, value: a.value, timestamp: a.timestamp }))),
        id
      );
    },

    completeSession(id) {
      db.prepare("UPDATE sessions SET completed_at = datetime('now'), phase = 'complete' WHERE id = ?").run(id);
    },

    // Decision operations
    createDecision(data) {
      db.prepare(
        'INSERT INTO decisions (id, session_id, category, question, answer, rationale, hash, previous_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(data.id, data.sessionId, data.category, data.question, data.answer, data.rationale, data.hash, data.previousHash ?? null);
      return db.prepare('SELECT * FROM decisions WHERE id = ?').get(data.id) as Decision;
    },

    listDecisions(sessionId) {
      const rows = db.prepare(
        'SELECT * FROM decisions WHERE session_id = ? ORDER BY created_at ASC'
      ).all(sessionId) as Record<string, unknown>[];
      return rows.map((row) => ({
        id: row.id as string,
        sessionId: row.session_id as string,
        category: row.category as string,
        question: row.question as string,
        answer: row.answer as string,
        rationale: row.rationale as string,
        hash: row.hash as string,
        previousHash: row.previous_hash as string | null,
        createdAt: row.created_at as string,
      }));
    },

    // Task operations
    createTask(data) {
      db.prepare(
        'INSERT INTO tasks (id, session_id, title, description, status, complexity_score, execution_mode) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(data.id, data.sessionId, data.title, data.description, data.status, data.complexityScore, data.executionMode);
      return db.prepare('SELECT * FROM tasks WHERE id = ?').get(data.id) as Task;
    },

    getTask(id) {
      return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
    },

    listTasksByStatus(sessionId, status) {
      return db.prepare(
        'SELECT * FROM tasks WHERE session_id = ? AND status = ? ORDER BY created_at ASC'
      ).all(sessionId, status) as Task[];
    },

    updateTask(id, patch) {
      const sets: string[] = [];
      const values: unknown[] = [];
      if (patch.status !== undefined) { sets.push('status = ?'); values.push(patch.status); }
      if (patch.output !== undefined) { sets.push('output = ?'); values.push(patch.output); }
      if (patch.completed_at !== undefined) { sets.push('completed_at = ?'); values.push(patch.completed_at); }
      if (sets.length === 0) return;
      values.push(id);
      db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    },

    // Observation operations
    createObservation(data) {
      db.prepare(
        'INSERT INTO observations (id, session_id, type, description, lesson, tags, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(data.id, data.sessionId, data.type, data.description, data.lesson, JSON.stringify(data.tags), data.confidence);
      return db.prepare('SELECT * FROM observations WHERE id = ?').get(data.id) as Observation;
    },

    listObservations(sessionId) {
      return db.prepare(
        'SELECT * FROM observations WHERE session_id = ? ORDER BY created_at DESC'
      ).all(sessionId) as Observation[];
    },
  };
}
