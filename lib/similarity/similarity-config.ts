export const SIMILARITY_CONFIG = {
  recentQuestionLimit: 500,
  maxGenerationRounds: 3,
  recent: { overall:0.86, tokenOverlap:0.92, jaccard:0.82, ngram:0.84, levenshtein:0.9 },
  batch: { overall:0.8, tokenOverlap:0.88, jaccard:0.76, ngram:0.78, levenshtein:0.86 },
  levenshteinPrefilter: 0.32,
  levenshteinMaxLength: 900,
  rotationWindow: 60,
  promptAvoidLimit: 12,
} as const;

export const DUPLICATE_EXHAUSTED_MESSAGE="這次產生的題目與近期內容太相似，請稍後再試。";
