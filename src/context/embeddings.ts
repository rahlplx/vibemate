import { createHash } from 'crypto';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, relative } from 'path';

export interface EmbeddingChunk {
  id: string;
  content: string;
  source: string;
  hash: string;
  embedding: number[];
}

export interface RetrievalResult {
  chunk: EmbeddingChunk;
  score: number;
}

export type EmbedFn = (text: string) => number[] | Promise<number[]>;

const EMBED_DIM = 256;

// Hash-based bag-of-words embedding: fixed-size, deterministic, no API needed.
// Uses FNV-1a to bucket word tokens, then L2-normalizes.
export function localEmbedFn(text: string): number[] {
  const vec = new Array<number>(EMBED_DIM).fill(0);
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  for (const token of tokens) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    vec[h % EMBED_DIM] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map(x => x / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export class EmbeddingStore {
  private chunks: EmbeddingChunk[] = [];
  private embedDir: string;
  private embedFn: EmbedFn;

  constructor(vibeDir: string, embedFn: EmbedFn = localEmbedFn) {
    this.embedDir = join(vibeDir, 'embeddings');
    this.embedFn = embedFn;
  }

  async embedChunk(content: string, source: string): Promise<EmbeddingChunk> {
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
    const embedding = await this.embedFn(content);
    const id = `${source}:${hash}`;
    return { id, content, source, hash, embedding };
  }

  async embedOKFChunks(vibeDir: string): Promise<EmbeddingChunk[]> {
    const mdFiles = await this.collectMdFiles(vibeDir);
    const chunks: EmbeddingChunk[] = [];
    for (const file of mdFiles) {
      const content = await readFile(file, 'utf-8');
      const sections = content.split(/(?=^#)/m).filter(s => s.trim().length > 30);
      for (const section of sections) {
        chunks.push(await this.embedChunk(section.trim(), relative(vibeDir, file)));
      }
    }
    this.chunks = chunks;
    return chunks;
  }

  private async collectMdFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...await this.collectMdFiles(fullPath));
        } else if (entry.name.endsWith('.md')) {
          results.push(fullPath);
        }
      }
    } catch { /* dir doesn't exist or isn't readable */ }
    return results;
  }

  async save(): Promise<void> {
    await mkdir(this.embedDir, { recursive: true });
    await writeFile(join(this.embedDir, 'chunks.json'), JSON.stringify(this.chunks, null, 2), 'utf-8');
  }

  async load(): Promise<boolean> {
    try {
      const raw = await readFile(join(this.embedDir, 'chunks.json'), 'utf-8');
      this.chunks = JSON.parse(raw) as EmbeddingChunk[];
      return true;
    } catch {
      return false;
    }
  }

  async retrieve(query: string, topK = 3): Promise<RetrievalResult[]> {
    if (this.chunks.length === 0) return [];
    const queryVec = await this.embedFn(query);
    const scored = this.chunks.map(chunk => ({
      chunk,
      score: cosineSimilarity(queryVec, chunk.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  addChunks(chunks: EmbeddingChunk[]): void {
    this.chunks.push(...chunks);
  }

  getChunks(): EmbeddingChunk[] {
    return [...this.chunks];
  }
}
