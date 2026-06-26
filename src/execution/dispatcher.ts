import { createConnection, closeConnection } from '../state/connection.js';
import { runMigrations } from '../state/migrations.js';
import { createStore, type Task } from '../state/store.js';

export interface Dispatcher {
  dispatch(
    projectId: string,
    sessionId: string,
    task: {
      title: string;
      description: string;
      complexityScore: number;
      executionMode: string;
    }
  ): string;
  getTask(id: string): Task | undefined;
  listTasks(sessionId: string): Task[];
  completeTask(id: string, output: string): void;
  failTask(id: string, error: string): void;
  close(): void;
}

export function createDispatcher(dbPath: string): Dispatcher {
  const conn = createConnection(dbPath);
  runMigrations(conn);
  const store = createStore(conn);

  return {
    dispatch(_projectId, sessionId, task) {
      const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      store.createTask({
        id,
        sessionId,
        title: task.title,
        description: task.description,
        status: 'pending',
        complexityScore: task.complexityScore,
        executionMode: task.executionMode,
      });
      return id;
    },

    getTask(id) {
      return store.getTask(id);
    },

    listTasks(sessionId) {
      const pending = store.listTasksByStatus(sessionId, 'pending');
      const inProgress = store.listTasksByStatus(sessionId, 'in_progress');
      const completed = store.listTasksByStatus(sessionId, 'completed');
      const failed = store.listTasksByStatus(sessionId, 'failed');
      const skipped = store.listTasksByStatus(sessionId, 'skipped');
      return [...pending, ...inProgress, ...completed, ...failed, ...skipped];
    },

    completeTask(id, output) {
      store.updateTask(id, {
        status: 'completed',
        output,
        completed_at: new Date().toISOString(),
      });
    },

    failTask(id, error) {
      store.updateTask(id, {
        status: 'failed',
        output: error,
      });
    },

    close() {
      closeConnection(conn);
    },
  };
}
