export const EMBEDDING_MODEL = "text-embedding-3-small";
export const GENERATION_MODEL = process.env.RAG_MODEL ?? "gpt-5-mini";
export const TOP_K = 4;
export const CHUNK_MAX_CHARS = Number(process.env.CHUNK_MAX_CHARS ?? 200);
export const INDEX_FILE = `corpus-${CHUNK_MAX_CHARS}.json`;
export const BM25_K1 = 1.2;
export const BM25_B = 0.75;
export const CANDIDATE_K = 8;
export const RERANK_MODEL = process.env.RERANK_MODEL ?? "Xenova/bge-reranker-base";
export const SYSTEM_PROMPT =
  "You answer strictly from the provided context. Answer only the specific question " +
  "asked, concisely and in a complete sentence; do not add related details that were " +
  "not asked for, even if they appear in the context. If the context does not contain the " +
  'answer, reply exactly: "I don\'t know based on the provided documents." ' +
  "Do not use outside knowledge.";
