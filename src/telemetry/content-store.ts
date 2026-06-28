import { writeFile, readFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import type { SpanContent } from '../types.js';

export class ContentStore {
  private dir: string;
  private ready: Promise<void>;

  constructor(dir: string) {
    this.dir = dir;
    this.ready = mkdir(dir, { recursive: true }).then(() => {});
  }

  async save(spanId: string, content: SpanContent): Promise<void> {
    await this.ready;
    await writeFile(join(this.dir, `${spanId}.json`), JSON.stringify(content), 'utf-8');
  }

  async load(spanId: string): Promise<SpanContent | null> {
    try {
      const raw = await readFile(join(this.dir, `${spanId}.json`), 'utf-8');
      return JSON.parse(raw) as SpanContent;
    } catch {
      return null;
    }
  }

  async listAll(): Promise<string[]> {
    await this.ready;
    try {
      const files = await readdir(this.dir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.slice(0, -5)); // strip .json
    } catch {
      return [];
    }
  }

  async exportAsJSONL(spanIds: string[], outputPath: string): Promise<number> {
    const lines: string[] = [];
    for (const id of spanIds) {
      const content = await this.load(id);
      if (content) lines.push(JSON.stringify(content));
    }
    await writeFile(outputPath, lines.join('\n') + (lines.length ? '\n' : ''), 'utf-8');
    return lines.length;
  }
}
