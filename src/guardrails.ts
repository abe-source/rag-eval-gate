// Regex backstops for refusal rules the system prompt states but doesn't hold reliably on its own.
const BYPASS_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget|bypass|override)\b[^.?!]{0,40}\b(context|instructions?|documents?|rules?|prompt|above)\b/i,
  /\b(from|using|with|based on)\s+your\s+(own\s+)?(knowledge|training|memory)\b/i,
  /\bwithout\s+(using\s+|consulting\s+|referring to\s+)?(the\s+)?(retrieved\s+)?(context|documents?)\b/i,
  /\b(repeat|print|output|show|display|reproduce|paste)\b[^.?!]{0,40}\b(everything|all|above|previous|prior|preceding|verbatim|this\s+conversation)\b/i,
];

export function isContextBypassAttempt(question: string): boolean {
  return BYPASS_PATTERNS.some((re) => re.test(question));
}

const META_PATTERNS: RegExp[] = [
  /\b(what|which)\s+(model|llm|ai)\s+(are\s+you|is\s+this|powers?\s+you)\b/i,
  /\bwho\s+(built|made|created|trained|designed)\s+you\b/i,
  /\bwhat\s+(are\s+you\s+for|do\s+you\s+do)\b/i,
  /\bwhat\s+(tools?|instructions?|rules?|prompt)s?\s+(do\s+you|are\s+you|does\s+it|govern\s+you)\b/i,
  /\bwhat\s+can\s+you\s+help\s+(me\s+)?with\b/i,
  /\b(rules?|instructions?)\s+you\s+(follow|use|have|obey|are\s+given)\b/i,
  /\bsummar(y|ise|ize)\b/i,
];

export function isMetaOrSummaryAttempt(question: string): boolean {
  return META_PATTERNS.some((re) => re.test(question));
}
