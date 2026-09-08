// One-time (or after changing the corpus): chunk + embed every doc and write
// the index to src/corpus.embeddings.json. That file is committed so CI does
// not need to pay for embeddings on every run.

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCorpus, embed, type Chunk } from "@/rag";
import { INDEX_FILE } from "@/config";

const HERE = dirname(fileURLToPath(import.meta.url));
const outPath = join(HERE, "..", "src", "index", INDEX_FILE);

const docs = loadCorpus();
console.log(`Embedding ${docs.length} chunks...`);

const vectors = await embed(docs.map((d) => d.text));
const index: Chunk[] = docs.map((d, i) => ({
  id: `${d.source}#${i}`,
  source: d.source,
  text: d.text,
  embedding: vectors[i] ?? [],
}));

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(index, null, 2));
console.log(`Wrote ${index.length} chunks -> ${outPath}`);
