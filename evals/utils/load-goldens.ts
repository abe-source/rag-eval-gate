import data from "@evals/data/goldens.json";

export type Category = "answerable" | "refusal" | "adversarial";

export interface Golden {
  category: Category;
  input: string;
  expectedOutput: string;
  // default "exact" (canon-equal); "includes" checks a canon-contain match instead.
  assertionType?: "exact" | "includes";
}

const all = data as Golden[];

export const goldens = (category: Category): Golden[] => all.filter((g) => g.category === category);
