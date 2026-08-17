interface SimilarityQuestion {question:string;passage?:string|null;options:Array<{text:string}>}

export const SIMILARITY_CONFIG = { batchThreshold: 0.78, recentThreshold: 0.84, recentQuestionLimitPhase2: 60 } as const;

export function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFKC").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function questionFingerprint(question: SimilarityQuestion) {
  return normalizeText([question.passage ?? "", question.question, ...question.options.map((option) => option.text)].join(" "));
}

export async function createQuestionHash(question: SimilarityQuestion) {
  const bytes = new TextEncoder().encode(questionFingerprint(question));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function tokens(value: string) { return new Set(normalizeText(value).split(" ").filter((token) => token.length > 1)); }
function jaccard(left: string, right: string) {
  const a = tokens(left); const b = tokens(right); if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / (a.size + b.size - intersection);
}
function bigrams(value: string) { const words = normalizeText(value).split(" "); return new Set(words.slice(0, -1).map((word, index) => `${word} ${words[index + 1]}`)); }
function ngramSimilarity(left: string, right: string) {
  const a = bigrams(left); const b = bigrams(right); if (!a.size || !b.size) return 0;
  return (2 * [...a].filter((item) => b.has(item)).length) / (a.size + b.size);
}
export function similarityScore(left: string, right: string) { return Math.max(jaccard(left, right), ngramSimilarity(left, right)); }

export function isQuestionTooSimilar(candidate: SimilarityQuestion, previous: SimilarityQuestion[], threshold: number = SIMILARITY_CONFIG.batchThreshold) {
  const fingerprint = questionFingerprint(candidate);
  return previous.some((question) => similarityScore(fingerprint, questionFingerprint(question)) >= threshold);
}
