// Edge-first design: no top-level runtime-specific imports.
// All I/O is behind StorageAdapter — swap Node fs for KV, R2, D1, or in-memory.

// ─── Pure-TS hash (no imports, works in any JS runtime) ──────────────────────

function fnv1aHex(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const lo = (h >>> 0).toString(16).padStart(8, '0');
  const hi = (((h >>> 16) ^ h) >>> 0).toString(16).padStart(8, '0');
  return lo + hi;
}

// ─── Storage adapter — the edge/runtime boundary ──────────────────────────────
//
// Implementations:
//   createMemoryAdapter()  — zero I/O, edge-safe, perfect for tests
//   createNodeAdapter()    — lazy fs/promises, tree-shaken from edge bundles
//   Bring your own        — Cloudflare KV, R2, Deno KV, Vercel Blob, etc.

export interface StorageAdapter {
  read(key: string): Promise<string>;
  write(key: string, data: string): Promise<void>;
  ensureDir(key: string): Promise<void>;
  /** Returns {key, source} pairs — key used with read(), source is relative display name */
  listMdFiles(dir: string): Promise<Array<{ key: string; source: string }>>;
}

/** In-memory adapter: zero I/O, edge-safe, ideal for tests and edge runtimes. */
export function createMemoryAdapter(seed: Record<string, string> = {}): StorageAdapter {
  const store = new Map<string, string>(Object.entries(seed));
  return {
    async read(k) {
      const v = store.get(k);
      if (v === undefined) throw Object.assign(new Error(`Not found: ${k}`), { code: 'ENOENT' });
      return v;
    },
    async write(k, v) { store.set(k, v); },
    async ensureDir() { /* no-op */ },
    async listMdFiles(dir) {
      const prefix = dir.endsWith('/') ? dir : dir + '/';
      return [...store.keys()]
        .filter(k => k.startsWith(prefix) && k.endsWith('.md'))
        .map(k => ({ key: k, source: k.slice(prefix.length).replace(/\\/g, '/') }));
    },
  };
}

/** Node.js adapter: lazy dynamic imports — edge bundles tree-shake fs/path out. */
export function createNodeAdapter(): StorageAdapter {
  type Fs = typeof import('fs/promises');
  type P = typeof import('path');
  let _fs: Fs | null = null;
  let _p: P | null = null;
  const getFs = async () => { _fs ??= await import('fs/promises'); return _fs; };
  const getP = async () => { _p ??= await import('path'); return _p; };

  async function walk(
    dir: string, root: string, fs: Fs, path: P
  ): Promise<Array<{ key: string; source: string }>> {
    const out: Array<{ key: string; source: string }> = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...await walk(full, root, fs, path));
        else if (e.name.endsWith('.md'))
          out.push({ key: full, source: path.relative(root, full).replace(/\\/g, '/') });
      }
    } catch { /* dir missing */ }
    return out;
  }

  return {
    async read(key) { return (await getFs()).readFile(key, 'utf-8'); },
    async write(key, data) { await (await getFs()).writeFile(key, data, 'utf-8'); },
    async ensureDir(key) { await (await getFs()).mkdir(key, { recursive: true }); },
    async listMdFiles(dir) {
      const [fs, path] = await Promise.all([getFs(), getP()]);
      return walk(dir, dir, fs, path);
    },
  };
}

// ─── Shared types ─────────────────────────────────────────────────────────────

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

// ─── Local embedding (fast fallback, no API, any runtime) ────────────────────

const EMBED_DIM = 256;

/** FNV-1a hash-based bag-of-words, 256-dim L2-normalized.
 *  Zero dependencies. Use BM25Store for better local relevance. */
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

// ─── Provider-agnostic cloud embedding factory ────────────────────────────────
//
// Works with any OpenAI-compatible /embeddings endpoint:
//   OpenAI:    baseUrl='https://api.openai.com/v1',    model='text-embedding-3-small'
//   Voyage:    baseUrl='https://api.voyageai.com/v1',  model='voyage-2'
//   Cohere:    baseUrl='https://api.cohere.com/v2',    model='embed-english-v3.0'
//   Mistral:   baseUrl='https://api.mistral.ai/v1',    model='mistral-embed'
//   Ollama:    baseUrl='http://localhost:11434/v1',     model='nomic-embed-text', apiKey='ollama'
//   LM Studio: baseUrl='http://localhost:1234/v1',      model='<local-model>'
//
// Uses fetch() — available natively in Cloudflare Workers, Deno, Bun, Node 18+.

export interface OpenAIEmbedConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function createOpenAICompatibleEmbedFn(config: OpenAIEmbedConfig): EmbedFn {
  return async (text: string) => {
    const res = await fetch(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ input: text, model: config.model }),
    });
    if (!res.ok) throw new Error(`Embedding API error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
  };
}

// ─── Vector store (pre-computed embeddings, hybrid: local + cloud EmbedFn) ───

export class EmbeddingStore {
  private chunks: EmbeddingChunk[] = [];
  private embedsKey: string;
  private embedDir: string;
  private embedFn: EmbedFn;
  private adapter: StorageAdapter;

  constructor(vibeDir: string, embedFn: EmbedFn = localEmbedFn, adapter?: StorageAdapter) {
    this.embedDir = `${vibeDir}/embeddings`;
    this.embedsKey = `${vibeDir}/embeddings/chunks.json`;
    this.embedFn = embedFn;
    this.adapter = adapter ?? createNodeAdapter();
  }

  async embedChunk(content: string, source: string): Promise<EmbeddingChunk> {
    const hash = fnv1aHex(content);
    const embedding = await this.embedFn(content);
    return { id: `${source}:${hash}`, content, source, hash, embedding };
  }

  async embedOKFChunks(dir: string): Promise<EmbeddingChunk[]> {
    const files = await this.adapter.listMdFiles(dir);
    const chunks: EmbeddingChunk[] = [];
    for (const { key, source } of files) {
      const content = await this.adapter.read(key);
      const sections = content.split(/(?=^#)/m).filter(s => s.trim().length > 30);
      for (const section of sections) {
        chunks.push(await this.embedChunk(section.trim(), source));
      }
    }
    this.chunks = chunks;
    return chunks;
  }

  async save(): Promise<void> {
    await this.adapter.ensureDir(this.embedDir);
    await this.adapter.write(this.embedsKey, JSON.stringify(this.chunks, null, 2));
  }

  async load(): Promise<boolean> {
    try {
      const raw = await this.adapter.read(this.embedsKey);
      this.chunks = JSON.parse(raw) as EmbeddingChunk[];
      return true;
    } catch { return false; }
  }

  async retrieve(query: string, topK = 3): Promise<RetrievalResult[]> {
    if (this.chunks.length === 0) return [];
    const queryVec = await this.embedFn(query);
    const scored = this.chunks.map(c => ({ chunk: c, score: cosineSimilarity(queryVec, c.embedding) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  addChunks(chunks: EmbeddingChunk[]): void { this.chunks.push(...chunks); }
  getChunks(): EmbeddingChunk[] { return [...this.chunks]; }
}

// ─── BM25 store (local, proven, zero-dependency) ─────────────────────────────
//
// Okapi BM25 (k1=1.5, b=0.75) — the algorithm behind Elasticsearch, Lucene,
// and OpenSearch. No embeddings, no API, no ML. Preferred for local retrieval.

export interface BM25Chunk { id: string; content: string; source: string; }
export interface BM25Result { chunk: BM25Chunk; score: number; }

export class BM25Store {
  private docs: BM25Chunk[] = [];
  private adapter: StorageAdapter;
  private k1 = 1.5;
  private b = 0.75;

  constructor(adapter?: StorageAdapter) {
    this.adapter = adapter ?? createNodeAdapter();
  }

  tokenize(text: string): string[] {
    return text.toLowerCase().split(/\W+/).filter(Boolean);
  }

  private idf(term: string): number {
    const df = this.docs.filter(d => this.tokenize(d.content).includes(term)).length;
    return Math.log((this.docs.length - df + 0.5) / (df + 0.5) + 1);
  }

  private bm25Score(query: string, doc: BM25Chunk): number {
    const qTerms = this.tokenize(query);
    const dTokens = this.tokenize(doc.content);
    const dl = dTokens.length;
    const avgdl = this.docs.reduce((s, d) => s + this.tokenize(d.content).length, 0) / (this.docs.length || 1);
    const freq = new Map<string, number>();
    for (const t of dTokens) freq.set(t, (freq.get(t) ?? 0) + 1);
    let total = 0;
    for (const term of qTerms) {
      const f = freq.get(term) ?? 0;
      const tf = (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * dl / avgdl));
      total += this.idf(term) * tf;
    }
    return total;
  }

  retrieve(query: string, topK = 3): BM25Result[] {
    if (this.docs.length === 0) return [];
    const scored = this.docs.map(d => ({ chunk: d, score: this.bm25Score(query, d) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async indexDir(dir: string): Promise<number> {
    const files = await this.adapter.listMdFiles(dir);
    const docs: BM25Chunk[] = [];
    for (const { key, source } of files) {
      const content = await this.adapter.read(key);
      const sections = content.split(/(?=^#)/m).filter(s => s.trim().length > 30);
      for (const section of sections) {
        const text = section.trim();
        docs.push({ id: `${source}:${fnv1aHex(text)}`, content: text, source });
      }
    }
    this.addDocs(docs);
    return docs.length;
  }

  addDocs(docs: BM25Chunk[]): void { this.docs.push(...docs); }
  getDocs(): BM25Chunk[] { return [...this.docs]; }
}
