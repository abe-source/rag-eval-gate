export const canon = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.\s]+$/, "")
    .toLowerCase();
