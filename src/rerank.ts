/* eslint-disable @typescript-eslint/no-explicit-any -- transformers.js runtime types are loose */
import { AutoModelForSequenceClassification, AutoTokenizer } from "@huggingface/transformers";
import { RERANK_MODEL } from "@/config";

const Model = AutoModelForSequenceClassification as any;
const Tokenizer = AutoTokenizer as any;

let loaded: Promise<[any, any]> | null = null;
const load = (): Promise<[any, any]> =>
  (loaded ??= Promise.all([
    Tokenizer.from_pretrained(RERANK_MODEL),
    Model.from_pretrained(RERANK_MODEL, { dtype: "q8" }),
  ]));

// Cross-encoder relevance score per (query, text) pair. Higher = more relevant. Deterministic.
export async function rerankScores(query: string, texts: string[]): Promise<number[]> {
  if (!texts.length) return [];
  const [tokenizer, model] = await load();
  const inputs = tokenizer(Array(texts.length).fill(query), {
    text_pair: texts,
    padding: true,
    truncation: true,
  });
  const { logits } = await model(inputs);
  return (logits.tolist() as number[][]).map((r) => r[0] ?? 0);
}
