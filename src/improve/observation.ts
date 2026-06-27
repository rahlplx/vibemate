import { createConnection, closeConnection } from '../state/connection.js';
import { runMigrations } from '../state/migrations.js';
import { createStore, type Observation } from '../state/store.js';

export interface ObservationEngine {
  recordObservation(
    sessionId: string,
    data: {
      type: string;
      description: string;
      lesson: string;
      tags: string[];
      confidence: number;
    }
  ): string;
  getObservation(id: string): Observation | undefined;
  getObservations(sessionId: string): Observation[];
  getInsights(minConfidence?: number): Observation[];
  close(): void;
}

export function createObservationEngine(dbPath: string): ObservationEngine {
  const conn = createConnection(dbPath);
  runMigrations(conn);
  const store = createStore(conn);
  const { db } = conn;

  return {
    recordObservation(sessionId, data) {
      const id = `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      store.createObservation({
        id,
        sessionId,
        type: data.type,
        description: data.description,
        lesson: data.lesson,
        tags: data.tags,
        confidence: data.confidence,
      });
      return id;
    },

    getObservation(id) {
      const result = db.prepare('SELECT * FROM observations WHERE id = ?').get(id);
      return result as Observation | undefined;
    },

    getObservations(sessionId) {
      return store.listObservations(sessionId);
    },

    getInsights(minConfidence = 0.9) {
      const results = db
        .prepare('SELECT * FROM observations WHERE confidence >= ? ORDER BY confidence DESC')
        .all(minConfidence);
      return results as unknown as Observation[];
    },

    close() {
      closeConnection(conn);
    },
  };
}
