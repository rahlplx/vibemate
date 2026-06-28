import { createHash } from 'crypto';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, relative } from 'path';

// ─── Shared types ────────────────────────────────────────────────────────────

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

// ─── Local embedding (fallback, no API) ──────────────────────────────────────

const EMBED_DIM = 256;

// FNV-1a hash-based bag-of-words: fixed-size, deterministic, zero-dependency.
// Suitable as a fast fallback; prefer BM25Store for local retrieval quality.
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
  if (a.length !== b.length) {
    throw new Error(`cosineSimilarity dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Provider-agnostic cloud embedding factory ───────────────────────────────
//
// Works with any OpenAI-compatible /embeddings endpoint:
//   OpenAI:   baseUrl = 'https://api.openai.com/v1',   model = 'text-embedding-3-small'
//   Voyage:   baseUrl = 'https://api.voyageai.com/v1', model = 'voyage-2'
//   Cohere:   baseUrl = 'https://api.cohere.com/v2',   model = 'embed-english-v3.0'
//   Mistral:  baseUrl = 'https://api.mistral.ai/v1',   model = 'mistral-embed'
//   Ollama:   baseUrl = 'http://localhost:11434/v1',    model = 'nomic-embed-text', apiKey = 'ollama'
//   LM Studio:baseUrl = 'http://localhost:1234/v1',     model = '<local-model-name>'

export interface OpenAIEmbedConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function createOpenAICompatibleEmbedFn(config: OpenAIEmbedConfig): EmbedFn {
  return async (text: string) => {
    const res = await fetch(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ input: text, model: config.model }),
    });
    if (!res.ok) {
      throw new Error(`Embedding API error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
  };
}

// ─── Vector store (for pre-computed embeddings) ───────────────────────────────

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
    const mdFiles = await collectMdFiles(vibeDir);
    const chunks: EmbeddingChunk[] = [];
    for (const file of mdFiles) {
      const content = await readFile(file, 'utf-8');
      const sections = content.split(/(?=^#)/m).filter(s => s.trim().length > 30);
      for (const section of sections) {
        // Normalize to forward slashes for cross-platform consistency
        const source = relative(vibeDir, file).replace(/\\/g, '/');
        chunks.push(await this.embedChunk(section.trim(), source));
      }
    }
    this.chunks = chunks;
    return chunks;
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

// ─── BM25 store (local, proven, zero-dependency) ─────────────────────────────
//
// Industry-standard Okapi BM25 (k1=1.5, b=0.75) — the same algorithm used
// by Elasticsearch, OpenSearch, and Lucene. No embeddings, no API, no ML.
// Preferred for local retrieval where pre-warmed embeddings are unavailable.

export interface BM25Chunk {
  id: string;
  content: string;
  source: string;
}

export interface BM25Result {
  chunk: BM25Chunk;
  score: number;
}

export class BM25Store {
  private docs: BM25Chunk[] = [];
  private k1 = 1.5;
  private b = 0.75;

  tokenize(text: string): string[] {
    return text.toLowerCase().split(/\W+/).filter(Boolean);
  }

  addDocs(docs: BM25Chunk[]): void {
    this.docs.push(...docs);
  }

  private idf(term: string): number {
    const df = this.docs.filter(d => this.tokenize(d.content).includes(term)).length;
    const N = this.docs.length;
    return Math.log((N - df + 0.5) / (df + 0.5) + 1);
  }

  private score(query: string, doc: BM25Chunk): number {
    const queryTerms = this.tokenize(query);
    const docTokens = this.tokenize(doc.content);
    const dl = docTokens.length;
    const avgdl = this.docs.reduce((s, d) => s + this.tokenize(d.content).length, 0) / (this.docs.length || 1);

    let total = 0;
    const freq = new Map<string, number>();
    for (const t of docTokens) freq.set(t, (freq.get(t) ?? 0) + 1);

    for (const term of queryTerms) {
      const f = freq.get(term) ?? 0;
      const tf = (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * dl / avgdl));
      total += this.idf(term) * tf;
    }
    return total;
  }

  retrieve(query: string, topK = 3): BM25Result[] {
    if (this.docs.length === 0) return [];
    const scored = this.docs.map(doc => ({ chunk: doc, score: this.score(query, doc) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async indexDir(dir: string): Promise<number> {
    const files = await collectMdFiles(dir);
    const docs: BM25Chunk[] = [];
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const sections = content.split(/(?=^#)/m).filter(s => s.trim().length > 30);
      for (const section of sections) {
        const text = section.trim();
        const source = relative(dir, file).replace(/\\/g, '/');
        const hash = createHash('sha256').update(text).digest('hex').slice(0, 16);
        docs.push({ id: `${source}:${hash}`, content: text, source });
      }
    }
    this.addDocs(docs);
    return docs.length;
  }

  getDocs(): BM25Chunk[] {
    return [...this.docs];
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function collectMdFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...await collectMdFiles(fullPath));
      } else if (entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  } catch { /* dir doesn't exist */ }
  return results;
}
