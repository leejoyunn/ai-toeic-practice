import { z } from "zod";

export const optionSchema = z.object({ id: z.enum(["A", "B", "C", "D"]), text: z.string().min(1).max(500) });
export const vocabularySchema = z.object({
  word: z.string().min(1).max(80),
  chineseMeaning: z.string().min(1).max(200),
  partOfSpeech: z.string().min(1).max(50),
  simpleExample: z.string().min(1).max(500).optional(),
  exampleTranslation: z.string().min(1).max(500).optional(),
  commonCollocations: z.array(z.string().max(100)).max(5).optional(),
});

export const generatedQuestionSchema = z.object({
  part: z.union([z.literal(5), z.literal(6), z.literal(7)]),
  questionType: z.string().min(1).max(80),
  question: z.string().min(8).max(1500),
  options: z.array(optionSchema).length(4),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(15).max(3000),
  translation: z.string().min(5).max(3000),
  vocabulary: z.array(vocabularySchema).min(1).max(8),
  grammarPoint: z.string().min(1).max(100),
  topic: z.string().min(1).max(100),
  scenario: z.string().min(1).max(100),
  vocabularyDomain: z.string().min(1).max(100),
  sentencePattern: z.string().min(1).max(160),
  difficulty: z.enum(["easy", "medium", "hard"]),
  targetScore: z.number().int().min(300).max(990),
  keywords: z.array(z.string().min(1).max(60)).min(2).max(10),
  passage: z.string().max(5000).nullable(),
  passageType: z.string().max(80).nullable(),
}).superRefine((question, context) => {
  if (new Set(question.options.map((option) => option.id)).size !== 4) context.addIssue({ code: "custom", message: "選項 ID 必須是 A、B、C、D 且不可重複。", path: ["options"] });
  if (new Set(question.options.map((option) => option.text.toLowerCase().trim())).size !== 4) context.addIssue({ code: "custom", message: "四個選項內容不可重複。", path: ["options"] });
  if (!question.options.some((option) => option.id === question.correctAnswer)) context.addIssue({ code: "custom", message: "正確答案不存在於選項中。", path: ["correctAnswer"] });
  if (!/[\u3400-\u9fff]/u.test(question.explanation)) context.addIssue({ code: "custom", message: "解析必須包含繁體中文。", path: ["explanation"] });
  if (!/[\u3400-\u9fff]/u.test(question.translation)) context.addIssue({ code: "custom", message: "翻譯必須包含繁體中文。", path: ["translation"] });
  if (question.part === 5 && (question.passage !== null || question.passageType !== null)) context.addIssue({ code: "custom", message: "Part 5 不應包含文章。", path: ["passage"] });
  if (question.part >= 6 && (!question.passage || question.passage.length < 40)) context.addIssue({ code: "custom", message: "Part 6、7 必須包含完整文章。", path: ["passage"] });
  if (question.part === 6) {
    const normalizedPassage = normalizeForComparison(question.passage ?? "");
    const normalizedPrompt = normalizeForComparison(question.question);
    if (!/\(\d+\)\s*_{2,}/u.test(question.passage ?? "")) context.addIssue({ code: "custom", message: "Part 6 文章必須保留編號空格，例如 (1) ____。", path: ["passage"] });
    if (question.question.length > 200 || (normalizedPassage.length >= 30 && normalizedPrompt.includes(normalizedPassage))) context.addIssue({ code: "custom", message: "Part 6 question 只能是簡短提示，不可重複完整文章。", path: ["question"] });
    if (/\[[A-D]\]/iu.test(question.question)) context.addIssue({ code: "custom", message: "Part 6 選項只能放在 options，不可嵌入 question。", path: ["question"] });
  }
});

function normalizeForComparison(value: string) {
  return value.toLowerCase().replace(/\s+/gu, "").replace(/[^a-z0-9\u3400-\u9fff_()]/gu, "");
}

export const generatedBatchSchema = z.object({ questions: z.array(generatedQuestionSchema).min(1).max(10) });
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const generationRequestSchema = z.object({
  part: z.union([z.literal(5), z.literal(6), z.literal(7)]),
  count: z.number().int().min(1).max(10),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  targetScore: z.number().int().min(300).max(990).optional(),
});

export const attemptRequestSchema = z.object({ questionId: z.string().uuid(), selectedAnswer: z.enum(["A", "B", "C", "D"]) });
