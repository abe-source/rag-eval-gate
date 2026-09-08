import { test, expect } from "vitest";
import type {} from "deepeval/vitest";
import { LLMTestCase } from "deepeval";
import { FaithfulnessMetric, AnswerRelevancyMetric } from "deepeval/metrics";
import { goldens } from "@evals/utils/load-goldens";
import { retryOnJudgeError } from "@evals/utils/retry";
import { JUDGE_MODEL, THRESHOLDS, EVAL_TIMEOUT_MS } from "@evals/settings";
import { askRag } from "@/rag";

test.each(goldens("answerable"))(
  "answer quality: $input",
  async ({ input }) => {
    const { answer, context } = await askRag(input);
    const testCase = new LLMTestCase({
      name: input,
      input,
      actualOutput: answer,
      retrievalContext: context,
    });
    await retryOnJudgeError(() =>
      expect(testCase).toPass([
        new FaithfulnessMetric({
          threshold: THRESHOLDS.faithfulness,
          model: JUDGE_MODEL,
          showIndicator: false,
        }),
        new AnswerRelevancyMetric({
          threshold: THRESHOLDS.answerRelevancy,
          model: JUDGE_MODEL,
          showIndicator: false,
        }),
      ]),
    );
  },
  EVAL_TIMEOUT_MS,
);
