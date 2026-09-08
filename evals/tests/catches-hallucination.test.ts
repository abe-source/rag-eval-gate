import { test, expect } from "vitest";
import { LLMTestCase } from "deepeval";
import { FaithfulnessMetric } from "deepeval/metrics";
import { hallucinations } from "@evals/utils/load-hallucinations";
import { retryOnJudgeError } from "@evals/utils/retry";
import { JUDGE_MODEL, THRESHOLDS, EVAL_TIMEOUT_MS } from "@evals/settings";

test.each(hallucinations)(
  "gate rejects a hallucinated answer: $input",
  async ({ input, retrievalContext, actualOutput }) => {
    const tc = new LLMTestCase({ name: input, input, actualOutput, retrievalContext });
    const score = await retryOnJudgeError(() =>
      new FaithfulnessMetric({
        threshold: THRESHOLDS.faithfulness,
        model: JUDGE_MODEL,
        showIndicator: false,
      }).measure(tc),
    );
    expect(score).toBeLessThan(THRESHOLDS.faithfulness);
  },
  EVAL_TIMEOUT_MS,
);
