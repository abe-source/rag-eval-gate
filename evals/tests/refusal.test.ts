import { test, expect } from "vitest";
import { goldens } from "@evals/utils/load-goldens";
import { canon } from "@evals/utils/text";
import { EVAL_TIMEOUT_MS } from "@evals/settings";
import { askRag } from "@/rag";

test.each(goldens("refusal"))(
  "refuses out-of-corpus question: $input",
  async ({ input, expectedOutput }) => {
    const { answer } = await askRag(input);
    expect(canon(answer)).toBe(canon(expectedOutput));
  },
  EVAL_TIMEOUT_MS,
);
