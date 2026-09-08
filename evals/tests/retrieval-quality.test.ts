import { test, expect } from "vitest";
import type {} from "deepeval/vitest";
import { LLMTestCase } from "deepeval";
import { ContextualRecallMetric, ContextualPrecisionMetric } from "deepeval/metrics";
import { goldens } from "@evals/utils/load-goldens";
import { retryOnJudgeError } from "@evals/utils/retry";
import { JUDGE_MODEL, THRESHOLDS, EVAL_TIMEOUT_MS } from "@evals/settings";
import { askRag } from "@/rag";

test.each(goldens("answerable"))(
  "retrieval quality: $input",
  async ({ input, expectedOutput }) => {
    const { answer, context } = await askRag(input);
    const testCase = new LLMTestCase({
      name: input,
      input,
      actualOutput: answer,
      expectedOutput,
      retrievalContext: context,
    });
    await retryOnJudgeError(() =>
      expect(testCase).toPass([
        new ContextualRecallMetric({
          threshold: THRESHOLDS.contextualRecall,
          model: JUDGE_MODEL,
          showIndicator: false,
        }),
        new ContextualPrecisionMetric({
          threshold: THRESHOLDS.contextualPrecision,
          model: JUDGE_MODEL,
          showIndicator: false,
        }),
      ]),
    );
  },
  EVAL_TIMEOUT_MS,
);
