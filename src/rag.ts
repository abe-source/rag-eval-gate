import OpenAI from "openai";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BM25_B,
  BM25_K1,
  CANDIDATE_K,
  CHUNK_MAX_CHARS,
  EMBEDDING_MODEL,
  GENERATION_MODEL,
  INDEX_FILE,
  SYSTEM_PROMPT,
  TOP_K,
} from "@/config";
import { rerankScores } from "@/rerank";

const HERE = dirname(fileURLToPath(import.meta.url));

let openaiClient: OpenAI | null = null;
const openai = () => (openaiClient ??= new OpenAI());

export interface Chunk {
  id: string;
  source: string;
  text: string;
  embedding: number[];
}

export interface RagResult {
  answer: string;
  /** The chunk texts retrieval fed to the model. This is DeepEval's `retrievalContext`. */
  context: string[];
}

// --- 1. ingest + chunk -------------------------------------------------------

/** Split on blank lines, fold lone headings into the next block, then pack up to ~maxChars. */
export function chunk(text: string, maxChars = CHUNK_MAX_CHARS): string[] {
  const raw = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // A standalone "# Title" matches every query and pollutes retrieval, so glue it onto the next block.
  const paras: string[] = [];
  let heading = "";
  for (const p of raw) {
    if (/^#{1,6}\s+\S.*$/.test(p) && !p.includes("\n")) {
      heading = heading ? heading + "\n" + p : p;
      continue;
    }
    paras.push(heading ? heading + "\n" + p : p);
    heading = "";
  }
  if (heading) paras.push(heading);

  const out: string[] = [];
  let buf = "";
  for (const p of paras) {
    if (buf && (buf + "\n\n" + p).length > maxChars) {
      out.push(buf);
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf) out.push(buf);
  return out;
}

export function loadCorpus(dir = join(HERE, "corpus")): { source: string; text: string }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .flatMap((f) => {
      const raw = readFileSync(join(dir, f), "utf8");
      return chunk(raw).map((text) => ({ source: f, text }));
    });
}

// --- 2. embed --------------------------------------------------------------

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await openai().embeddings.create({ model: EMBEDDING_MODEL, input: texts });
  return res.data.map((d) => d.embedding);
}

// --- 3. retrieve ---------------------------------------------------------------

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function retrieve(queryEmbedding: number[], chunks: Chunk[], k = TOP_K): Chunk[] {
  return chunks
    .map((c) => ({ c, score: cosine(queryEmbedding, c.embedding) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k)
    .map((x) => x.c);
}

// --- lexical retrieval (BM25) ---------------------------------------------------

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export interface Bm25Index {
  chunks: Chunk[];
  tf: Map<string, number>[];
  df: Map<string, number>;
  docLen: number[];
  avgdl: number;
  n: number;
}

export function buildBm25Index(chunks: Chunk[]): Bm25Index {
  const tokens = chunks.map((c) => tokenize(c.text));
  const tf = tokens.map((toks) => {
    const m = new Map<string, number>();
    for (const t of toks) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  });
  const df = new Map<string, number>();
  for (const m of tf) {
    for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const docLen = tokens.map((t) => t.length);
  const avgdl = docLen.reduce((a, b) => a + b, 0) / (docLen.length || 1);
  return { chunks, tf, df, docLen, avgdl, n: chunks.length };
}

function idf(term: string, idx: Bm25Index): number {
  const n = idx.df.get(term) ?? 0;
  return Math.log(1 + (idx.n - n + 0.5) / (n + 0.5));
}

export function bm25Search(query: string, idx: Bm25Index, k: number): Chunk[] {
  const q = tokenize(query);
  return idx.chunks
    .map((c, i) => {
      const tf = idx.tf[i] ?? new Map<string, number>();
      const len = idx.docLen[i] ?? 0;
      let score = 0;
      for (const term of q) {
        const f = tf.get(term) ?? 0;
        if (f === 0) continue;
        const norm = f + BM25_K1 * (1 - BM25_B + (BM25_B * len) / idx.avgdl);
        score += (idf(term, idx) * (f * (BM25_K1 + 1))) / norm;
      }
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.c);
}

// --- hybrid retrieval: vector + BM25 candidates, cross-encoder rerank ---------

export async function hybridRetrieve(
  query: string,
  queryEmbedding: number[],
  chunks: Chunk[],
  bm25: Bm25Index,
  k = TOP_K,
): Promise<Chunk[]> {
  const seen = new Set<string>();
  const candidates: Chunk[] = [];
  for (const c of [
    ...retrieve(queryEmbedding, chunks, CANDIDATE_K),
    ...bm25Search(query, bm25, CANDIDATE_K),
  ]) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    candidates.push(c);
  }

  const scores = await rerankScores(
    query,
    candidates.map((c) => c.text),
  );
  return candidates
    .map((c, i) => ({ c, score: scores[i] ?? -Infinity }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.c);
}

// --- 4. generate -------------------------------------------------------------

export async function generate(question: string, context: string[]): Promise<string> {
  const contextBlock = context.map((c, i) => `[${i + 1}] ${c}`).join("\n\n");
  const res = await openai().chat.completions.create({
    model: GENERATION_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Context:\n${contextBlock}\n\nQuestion: ${question}` },
    ],
  });
  return res.choices[0]?.message.content ?? "";
}

// --- 5. full pipeline ------------------------------------------------------

let cachedIndex: Chunk[] | null = null;
let cachedBm25: Bm25Index | null = null;

export function loadIndex(path = join(HERE, "index", INDEX_FILE)): Chunk[] {
  if (!cachedIndex) {
    cachedIndex = JSON.parse(readFileSync(path, "utf8")) as Chunk[];
  }
  return cachedIndex;
}

function loadBm25(chunks: Chunk[]): Bm25Index {
  return (cachedBm25 ??= buildBm25Index(chunks));
}

export async function askRag(question: string): Promise<RagResult> {
  const index = loadIndex();
  const bm25 = loadBm25(index);
  const [queryEmbedding] = await embed([question]);
  if (!queryEmbedding) throw new Error("failed to embed the question");
  const top = await hybridRetrieve(question, queryEmbedding, index, bm25);
  const context = top.map((c) => c.text);
  const answer = await generate(question, context);
  return { answer, context };
}
