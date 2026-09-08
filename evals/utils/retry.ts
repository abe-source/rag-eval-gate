// Retry a judged assertion when the LLM judge returns schema-invalid JSON; deepeval-ts has no retry of its own.
export async function retryOnJudgeError<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isJudgeParseError(err)) throw err;
      console.warn(`judge returned unparseable output, retry ${attempt}/${attempts - 1}`);
    }
  }
  return fn();
}

// deepeval bundles zod unexported, so match error names rather than instanceof.
function isJudgeParseError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "ZodError" || (err.name === "DeepEvalError" && /schema/i.test(err.message));
}
