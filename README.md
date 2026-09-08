<p align="center">
  <img src="assets/hero.svg" alt="rag-eval-gate" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/abe-source/rag-eval-gate/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-22d3ee.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D24-22d3ee.svg" alt="Node >= 24">
  <img src="https://img.shields.io/badge/TypeScript-5-22d3ee.svg" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/evals-DeepEval--TS-22d3ee.svg" alt="DeepEval-TS">
  <img src="https://img.shields.io/badge/CI-GitHub%20Actions-22d3ee.svg" alt="GitHub Actions">
</p>

## Answer quality as a merge gate

Picture your RAG chatbot fielding a real user question and confidently handing back
something false. No error, no failing test: just a prompt tweak or a model swap that
CI never looked at, because CI checks code, not answers.

`rag-eval-gate` is a worked example of closing that gap: making answer quality a merge
blocker. Every pull request runs faithfulness, answer-relevancy and retrieval checks
against a real retrieve-and-generate pipeline, graded by an LLM judge
([DeepEval-TS](https://www.npmjs.com/package/deepeval)). Scores fall below threshold,
the check goes red, the PR is stuck. The corpus is fictional; what you take is the
eval harness and the CI wiring.

## Seeing it block a bad change

Swap the strict grounded-answer prompt for a generic one and push: the static checks
still pass, but the eval suite catches the drop. Out-of-corpus questions get answered
from general knowledge instead of declined, and other answers wander off what was
asked. CI goes red.

![evals CI run failing after a weakened system prompt](assets/ci-red.png)

## What the evals caught building this

| Finding                 | How the eval caught it                                                                                                                                             | Fix                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Retrieval missed a fact | "What warranty does the Nyx R7 come with?" scored Contextual Recall 0.00; the warranty line sat in a four-topic paragraph, diluted, outranked by four other chunks | split the paragraph, add headings, re-embed. Source fix, not a retrieval hack             |
| A bad test case         | a question tagged "must refuse" was answerable from context; the refusal eval failed intermittently                                                                | dropped the golden                                                                        |
| Ranking weakness        | pure cosine passed recall but failed Contextual Precision on 7 of 14 spec lookups: right chunk retrieved, ranked below noise                                       | hybrid BM25 + local cross-encoder reranker; mean precision 0.65 to 0.90, recall unchanged |

## What runs on every PR

| Eval                    | Metric(s)                                                              | A failure means                                                                                    |
| ----------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `answer-quality`        | Faithfulness ≥ 0.8, Answer Relevancy ≥ 0.7                             | the answer contradicts or strays from its retrieved context                                        |
| `retrieval-quality`     | Contextual Recall ≥ 0.7 (the gate), Contextual Precision ≥ 0.3 (floor) | retrieval missed the chunk the answer needs, or buried it under noise                              |
| `refusal`               | exact-string match, no judge                                           | an out-of-corpus question got an answer instead of `I don't know based on the provided documents.` |
| `catches-hallucination` | Faithfulness < 0.8 on planted bad answers                              | the gate itself stopped rejecting hallucinations                                                   |

Recall is the meaningful retrieval gate; precision sits at a low floor because this
pipeline feeds every top-K chunk to the generator equally, so rank-order has no
downstream effect and a genuine regression still trips recall. Thresholds live in
`evals/settings.ts`.

## Pipeline

`src/rag.ts` is the whole RAG:

1. **chunk** the corpus (`src/corpus/*.md`) on blank lines, fold lone headings forward, pack to ~200 chars
2. **embed** each chunk (`text-embedding-3-small`); the index is committed so CI never pays to re-embed
3. **retrieve**, two stages:
   - candidates: vector top-8 (cosine) ∪ BM25 top-8 (hand-rolled Okapi)
   - rerank: a local cross-encoder (`bge-reranker-base` via transformers.js, no API) scores the union, keep top-4
4. **generate** from the retrieved chunks (`gpt-5-mini`) under a strict grounded-answer prompt; out-of-corpus questions get an exact refusal string
5. return `{ answer, context }`, the inputs DeepEval's metrics need

Pure-vector `retrieve()` is kept alongside `hybridRetrieve()` as an A/B baseline.

## Layout

```
src/
  rag.ts                  the pipeline: chunk, embed, retrieve (vector + BM25), rerank, generate
  rerank.ts               local cross-encoder wrapper (transformers.js)
  config.ts               knobs: models, TOP_K, chunk size, BM25 / rerank params, system prompt
  corpus/*.md             fictional Nyx R7 LiDAR doc set (the knowledge base)
  index/corpus-<n>.json   embedded index, keyed to chunk size, committed
scripts/
  embed.ts                build the index
  ask.ts                  query the pipeline by hand
evals/                    LLM-as-judge suite, run by DeepEval
  tests/                  the 4 eval specs above
  data/                   goldens.json (14 answerable + 5 refusal), hallucinations.json
  utils/                  fixture loaders, judge-retry wrapper, string canon
  settings.ts             judge model + thresholds
test/
  rag.unit.test.ts        deterministic unit tests: tokenize, cosine, chunk, retrieve, BM25
docs/
  corpus-facts.md         frozen ground truth behind every eval assertion
.github/workflows/evals.yml   the gate: static checks + unit + eval, on PR
```

**Two test tiers, kept apart on purpose.** Eval tests (`evals/`) are
non-deterministic, graded by an LLM judge, and only run under DeepEval (it registers
the `toPass` matcher). Unit tests (`test/`) are deterministic and run under plain
Vitest. Separate directories, separate commands, no shared config, so the runners
never collide.

## Run

```bash
npm install
export OPENAI_API_KEY=sk-...        # or see .envrc.example for a macOS Keychain + direnv setup

npm run embed                       # once, or after editing the corpus
npm run ask "What warranty does the Nyx R7 come with?"

npm test                            # unit tests (Vitest, deterministic, no API)
npm run eval                        # full eval suite (DeepEval, calls OpenAI)
npm run eval:answer                 # just the answer-quality gate
```

`npm run eval` calls OpenAI for embeddings, generation, and every judge metric:
roughly 15 minutes and a few cents per full run. CI needs `OPENAI_API_KEY` as a repo
Actions secret.

## Adapting this to your corpus

The eval mechanics are generic; the Nyx R7 content is not. To point it at your own:

1. Replace `src/corpus/*.md` with your documents, then `npm run embed` to rebuild the index.
2. Rewrite `docs/corpus-facts.md`, the frozen ground truth every assertion checks against.
3. Rewrite `evals/data/goldens.json` (answerable + refusal questions) and `evals/data/hallucinations.json` (planted bad answers) for your facts.
4. If your RAG is not local retrieve-and-generate, repoint `askRag` in `src/rag.ts` at your pipeline; the eval specs only need it to return `{ answer, context }`.
5. Tune the thresholds in `evals/settings.ts` to your quality bar.

## Stack

- **Retrieval:** hand-rolled cosine + Okapi BM25, in-memory index, no vector DB
- **Rerank:** `Xenova/bge-reranker-base` cross-encoder via transformers.js: local, deterministic, no API
- **Models:** OpenAI `text-embedding-3-small` + `gpt-5-mini`
- **Evals:** DeepEval-TS, LLM-as-judge on `gpt-5-mini`
- **CI:** GitHub Actions, on every pull request

The judge and the generator are the same model here (`gpt-5-mini`) to keep the example
cheap and simple. A real setup would use a separate, stronger judge so it does not
share the generator's blind spots.
