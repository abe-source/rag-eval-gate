import { askRag } from "@/rag";

const question = process.argv.slice(2).join(" ").trim();

if (!question) {
  console.error('Usage: npm run ask "your question here"');
  process.exit(1);
}

const { answer, context } = await askRag(question);

console.log(`\nQ: ${question}\n`);
console.log(`A: ${answer}\n`);
console.log(`--- retrieved context (${context.length} chunks) ---`);
context.forEach((c, i) => {
  const preview = c.replace(/\s+/g, " ").slice(0, 120);
  console.log(`[${i + 1}] ${preview}${c.length > 120 ? "..." : ""}`);
});
