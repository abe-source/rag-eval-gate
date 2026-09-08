import data from "@evals/data/hallucinations.json";

export interface Hallucination {
  input: string;
  retrievalContext: string[];
  actualOutput: string;
}

export const hallucinations = data as Hallucination[];
