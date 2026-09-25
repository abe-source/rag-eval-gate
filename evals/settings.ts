export const JUDGE_MODEL = "gpt-5-mini";

export const EVAL_TIMEOUT_MS = 120_000;

export const THRESHOLDS = {
  faithfulness: 0.8,
  answerRelevancy: 0.7,
  contextualRecall: 0.7,
  contextualPrecision: 0.3, // relevant chunk must be in the top 3 of 4
  roleViolation: 1, // binary metric: 1 = no violation, 0 = violation
} as const;
