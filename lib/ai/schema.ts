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

export const passageDocumentSchema = z.object({
  id: z.string().min(1).max(20),
  label: z.string().min(1).max(80),
  type: z.string().min(1).max(80),
  content: z.string().min(40).max(5000),
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
  passageGroupId: z.string().min(1).max(80).nullable(),
  blankNumber: z.number().int().min(1).max(10).nullable(),
  documents: z.array(passageDocumentSchema).max(3),
}).superRefine((question, context) => {
  if (new Set(question.options.map((option) => option.id)).size !== 4) context.addIssue({ code: "custom", message: "選項 ID 必須是 A、B、C、D 且不可重複。", path: ["options"] });
  if (new Set(question.options.map((option) => option.text.toLowerCase().trim())).size !== 4) context.addIssue({ code: "custom", message: "四個選項內容不可重複。", path: ["options"] });
  if (!question.options.some((option) => option.id === question.correctAnswer)) context.addIssue({ code: "custom", message: "正確答案不存在於選項中。", path: ["correctAnswer"] });
  if (!/[\u3400-\u9fff]/u.test(question.explanation)) context.addIssue({ code: "custom", message: "解析必須包含繁體中文。", path: ["explanation"] });
  if (!/[\u3400-\u9fff]/u.test(question.translation)) context.addIssue({ code: "custom", message: "翻譯必須包含繁體中文。", path: ["translation"] });
  if (question.part === 5 && (question.passage !== null || question.passageType !== null)) context.addIssue({ code: "custom", message: "Part 5 不應包含文章。", path: ["passage"] });
  if (question.part === 5 && (question.passageGroupId !== null || question.blankNumber !== null || question.documents.length)) context.addIssue({ code: "custom", message: "Part 5 不應包含文章群組資料。", path: ["passageGroupId"] });
  if (question.part >= 6 && (!question.passage || question.passage.length < 40)) context.addIssue({ code: "custom", message: "Part 6、7 必須包含完整文章。", path: ["passage"] });
  if (question.part >= 6 && !isMostlyEnglish(question.passage ?? "")) context.addIssue({ code: "custom", message: "Part 6、7 原文必須以英文為主，中文只能放在 translation。", path: ["passage"] });
  if (question.documents.some((document) => !isMostlyEnglish(document.content))) context.addIssue({ code: "custom", message: "每份 Part 6、7 document 都必須是英文原文。", path: ["documents"] });
  if (question.part === 6) {
    const normalizedPassage = normalizeForComparison(question.passage ?? "");
    const normalizedPrompt = normalizeForComparison(question.question);
    if (!/\(\d+\)\s*_{2,}/u.test(question.passage ?? "")) context.addIssue({ code: "custom", message: "Part 6 文章必須保留編號空格，例如 (1) ____。", path: ["passage"] });
    if (question.question.length > 200 || (normalizedPassage.length >= 30 && normalizedPrompt.includes(normalizedPassage))) context.addIssue({ code: "custom", message: "Part 6 question 只能是簡短提示，不可重複完整文章。", path: ["question"] });
    if (/\[[A-D]\]/iu.test(question.question)) context.addIssue({ code: "custom", message: "Part 6 選項只能放在 options，不可嵌入 question。", path: ["question"] });
    if (!question.passageGroupId || !question.blankNumber) context.addIssue({ code: "custom", message: "Part 6 必須標示共用文章群組與 blank 編號。", path: ["passageGroupId"] });
    if (!question.blankNumber || !new RegExp(`\\(${question.blankNumber}\\)\\s*_{2,}`, "u").test(question.passage ?? "")) context.addIssue({ code: "custom", message: "Part 6 blankNumber 必須對應 passage 內的編號空格。", path: ["blankNumber"] });
    if (!["vocabulary", "grammar", "sentence_insertion", "context"].includes(question.questionType)) context.addIssue({ code: "custom", message: "Part 6 題型必須是 vocabulary、grammar、sentence_insertion 或 context。", path: ["questionType"] });
  }
  if (question.part === 7) {
    const expectedDocuments = question.passageType === "single_passage" ? 1 : question.passageType === "double_passage" ? 2 : question.passageType === "triple_passage" ? 3 : 0;
    if (!question.passageGroupId || !expectedDocuments || question.documents.length !== expectedDocuments) context.addIssue({ code: "custom", message: "Part 7 passageType 必須和 Single／Double／Triple 文件數一致。", path: ["documents"] });
    if (question.blankNumber !== null) context.addIssue({ code: "custom", message: "Part 7 不應包含 blankNumber。", path: ["blankNumber"] });
    if (!["detail", "main_purpose", "paraphrase", "inference", "vocabulary_in_context", "cross_document"].includes(question.questionType)) context.addIssue({ code: "custom", message: "Part 7 questionType 不符合支援的閱讀題型。", path: ["questionType"] });
    if (question.questionType === "cross_document" && question.documents.length < 2) context.addIssue({ code: "custom", message: "跨文件題必須使用 Double 或 Triple Passage。", path: ["questionType"] });
  }
});

function normalizeForComparison(value: string) {
  return value.toLowerCase().replace(/\s+/gu, "").replace(/[^a-z0-9\u3400-\u9fff_()]/gu, "");
}

function isMostlyEnglish(value: string) {
  const latinCharacters = value.match(/[A-Za-z]/gu)?.length ?? 0;
  const chineseCharacters = value.match(/[\u3400-\u9fff]/gu)?.length ?? 0;
  return latinCharacters >= 30 && latinCharacters > chineseCharacters * 3;
}

export const generatedBatchSchema = z.object({ questions: z.array(generatedQuestionSchema).min(1).max(10) }).superRefine(({questions}, context) => {
  for (const part of [6, 7] as const) {
    const partQuestions = questions.filter((question) => question.part === part);
    if (!partQuestions.length) continue;
    const groups = Map.groupBy(partQuestions, (question) => question.passageGroupId);
    for (const [groupId, group] of groups) {
      if (!groupId || group.length < 2) context.addIssue({ code: "custom", message: `Part ${part} 每個文章群組至少要對應兩題。`, path: ["questions"] });
      const first = group[0];
      if (group.some((question) => question.passage !== first.passage || JSON.stringify(question.documents) !== JSON.stringify(first.documents))) context.addIssue({ code: "custom", message: `Part ${part} 同群組題目必須共用完全相同的文章資料。`, path: ["questions"] });
      const questionTypes = new Set(group.map((question) => question.questionType));
      if (part === 6 && group.length >= 4 && !["vocabulary", "grammar", "sentence_insertion", "context"].every((type) => questionTypes.has(type))) context.addIssue({ code: "custom", message: "Part 6 多題文章必須混合單字、文法、句子插入與上下文題型。", path: ["questions"] });
      if (part === 7 && questionTypes.size < Math.min(3, group.length)) context.addIssue({ code: "custom", message: "Part 7 同組題目不可全部使用同一種閱讀題型。", path: ["questions"] });
      if (part === 7 && first.difficulty === "easy" && group.length >= 2 && !questionTypes.has("paraphrase")) context.addIssue({ code: "custom", message: "Part 7 Easy 至少要有一題同義改寫。", path: ["questions"] });
      if (part === 7 && first.difficulty !== "easy" && !questionTypes.has("inference")) context.addIssue({ code: "custom", message: "Part 7 Medium／Hard 至少要有一題推論。", path: ["questions"] });
      if (part === 7 && first.documents.length >= 2 && !questionTypes.has("cross_document")) context.addIssue({ code: "custom", message: "Double／Triple Passage 至少要有一題跨文件整合。", path: ["questions"] });
    }
  }
});
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const generationRequestSchema = z.object({
  part: z.union([z.literal(5), z.literal(6), z.literal(7)]),
  count: z.number().int().min(1).max(10),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  targetScore: z.number().int().min(300).max(990).optional(),
  passageMode: z.enum(["single", "double", "triple"]).optional(),
});

export const attemptRequestSchema = z.object({ questionId: z.string().uuid(), selectedAnswer: z.enum(["A", "B", "C", "D"]), sessionId:z.string().uuid().optional() });
