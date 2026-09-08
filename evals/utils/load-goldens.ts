import data from "@evals/data/goldens.json";

export type Category = "answerable" | "refusal";

export interface Golden {
  category: Category;
  input: string;
  expectedOutput: string;
}

const all = data as Golden[];

export const goldens = (category: Category): Golden[] => all.filter((g) => g.category === category);
