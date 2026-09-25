import { describe, test, expect } from "vitest";
import { cosine, chunk, retrieve, buildBm25Index, bm25Search, type Chunk } from "@/rag";
import { tokenize } from "@/text";

const mkChunk = (id: string, text: string, embedding: number[]): Chunk => ({
  id,
  source: "test.md",
  text,
  embedding,
});

describe("tokenize", () => {
  test("lowercases and splits on non-alphanumeric", () => {
    expect(tokenize("The Nyx-R7, IP54!")).toEqual(["the", "nyx", "r7", "ip54"]);
  });
  test("returns [] for punctuation only", () => {
    expect(tokenize("  --- ... ")).toEqual([]);
  });
});

describe("cosine", () => {
  test("1 for identical vectors", () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });
  test("0 for orthogonal vectors", () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });
  test("scale-invariant", () => {
    expect(cosine([1, 1], [3, 3])).toBeCloseTo(1);
  });
});

describe("chunk", () => {
  test("splits on blank lines", () => {
    expect(chunk("a\n\nb\n\nc", 1)).toEqual(["a", "b", "c"]);
  });
  test("folds a lone heading into the next block", () => {
    expect(chunk("## Title\n\nbody text", 1000)).toEqual(["## Title\nbody text"]);
  });
  test("packs blocks up to maxChars", () => {
    expect(chunk("aaa\n\nbbb\n\nccc", 9)).toEqual(["aaa\n\nbbb", "ccc"]);
  });
});

describe("retrieve", () => {
  const chunks = [
    mkChunk("a", "a", [1, 0]),
    mkChunk("b", "b", [0, 1]),
    mkChunk("c", "c", [0.9, 0.1]),
  ];
  test("returns the top-K by cosine to the query", () => {
    expect(retrieve([1, 0], chunks, 2).map((c) => c.id)).toEqual(["a", "c"]);
  });
});

describe("buildBm25Index", () => {
  test("computes tf, df, docLen and avgdl", () => {
    const idx = buildBm25Index([mkChunk("a", "red red blue", []), mkChunk("b", "blue green", [])]);
    expect(idx.n).toBe(2);
    expect(idx.docLen).toEqual([3, 2]);
    expect(idx.avgdl).toBe(2.5);
    expect(idx.df.get("blue")).toBe(2);
    expect(idx.df.get("red")).toBe(1);
    expect(idx.tf[0]?.get("red")).toBe(2);
  });
});

describe("bm25Search", () => {
  const idx = buildBm25Index([
    mkChunk("hit", "the warranty is two years", []),
    mkChunk("miss", "battery life and charging", []),
  ]);
  test("ranks a doc with the query term above one without", () => {
    expect(bm25Search("warranty", idx, 2).map((c) => c.id)).toEqual(["hit"]);
  });
  test("returns [] when no doc matches", () => {
    expect(bm25Search("nonexistent", idx, 2)).toEqual([]);
  });
});
