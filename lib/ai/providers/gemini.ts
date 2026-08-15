import { generatedBatchSchema, type GeneratedQuestion } from "@/lib/ai/schema";
import { AiProviderUnavailableError, type AiProvider, type GenerateQuestionsInput } from "@/lib/ai/provider";
import { partGuidance } from "@/lib/toeic/difficulty";

const RESPONSE_SCHEMA = {
  type: "object",
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: {
        type: "object",
        required: ["part","questionType","question","options","correctAnswer","explanation","translation","vocabulary","grammarPoint","topic","scenario","vocabularyDomain","sentencePattern","difficulty","targetScore","keywords","passage","passageType"],
        properties: {
          part: { type: "integer", enum: [5,6,7] }, questionType: { type: "string" }, question: { type: "string" },
          options: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", required: ["id","text"], properties: { id: { type: "string", enum: ["A","B","C","D"] }, text: { type: "string" } } } },
          correctAnswer: { type: "string", enum: ["A","B","C","D"] }, explanation: { type: "string" }, translation: { type: "string" },
          vocabulary: { type: "array", minItems: 1, maxItems: 8, items: { type: "object", required: ["word","chineseMeaning","partOfSpeech"], properties: { word:{type:"string"}, chineseMeaning:{type:"string"}, partOfSpeech:{type:"string"}, simpleExample:{type:"string"}, exampleTranslation:{type:"string"}, commonCollocations:{type:"array",items:{type:"string"}} } } },
          grammarPoint:{type:"string"}, topic:{type:"string"}, scenario:{type:"string"}, vocabularyDomain:{type:"string"}, sentencePattern:{type:"string"},
          difficulty:{type:"string",enum:["easy","medium","hard"]}, targetScore:{type:"integer"}, keywords:{type:"array",items:{type:"string"}},
          passage:{anyOf:[{type:"string"},{type:"null"}]}, passageType:{anyOf:[{type:"string"},{type:"null"}]},
        },
      },
    },
  },
};

function buildPrompt(input: GenerateQuestionsInput, retryNote = "") {
  return `你是專門協助繁體中文初學者的 TOEIC Reading 教材編寫老師。請生成 ${input.count} 題完全原創、非官方考題的 Part ${input.part} 四選一練習題。

學習者目前估計程度：${input.currentEstimatedLevel}。目標分數：${input.targetScore}。本批難度：${input.difficulty}。
Part 規格：${partGuidance(input.part)}
弱項參考：${input.weakSkills.join("、") || "基礎文法與高頻字彙"}
最近已用情境（本批盡量避開）：${input.recentScenarios.join("、") || "無"}
最近字彙領域（本批輪替）：${input.recentVocabularyDomains.join("、") || "無"}
最近句型（本批不得只換主詞重做）：${input.recentSentencePatterns.join("、") || "無"}

強制品質規則：
1. 每題只有一個合理最佳答案，A/B/C/D 各出現一次。
2. explanation 使用繁體中文、短句、白話，說明「為什麼這個答案對」及「其他選項為什麼不適合」，英文很弱也能懂。
3. translation 是題目全文（Part 6/7 含文章）的完整繁體中文翻譯。
4. vocabulary 至少列 1 個重要字，包含中文與詞性。
5. Part 5 的 passage、passageType 必須為 null；Part 6/7 必須有完整 passage 與 passageType。
6. 每題都要有 grammarPoint、topic、scenario、vocabularyDomain、sentencePattern、keywords、difficulty、targetScore。
7. 同一批題目必須輪替情境、核心單字、主詞、句型與考點；不得產生只有替換人名或名詞的近似題。
8. 不得引用、改寫或聲稱來自 ETS／TOEIC 官方考題。
9. targetScore 請填 ${input.targetScore}，part 請填 ${input.part}，difficulty 請填 ${input.difficulty}。
${retryNote}`;
}

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  async generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.AI_API_KEY;
    if (!apiKey) throw new AiProviderUnavailableError("尚未設定 Gemini API Key，請先完成環境變數設定。");
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: buildPrompt(input, attempt ? "前次輸出未通過格式或品質驗證，請逐欄檢查後重新生成。" : "") }] }],
            generationConfig: { temperature: 0.9, responseMimeType: "application/json", responseJsonSchema: RESPONSE_SCHEMA },
          }),
          signal: AbortSignal.timeout(45_000),
        });
        if (!response.ok) {
          const detail = await response.text();
          if ([401,403].includes(response.status)) throw new AiProviderUnavailableError("Gemini API Key 無效或沒有使用權限，請檢查設定。");
          if (response.status === 429) throw new AiProviderUnavailableError("Gemini 免費額度目前忙碌，請稍後再試。");
          throw new Error(`Gemini ${response.status}: ${detail.slice(0, 300)}`);
        }
        const payload: unknown = await response.json();
        const text = extractText(payload);
        const parsed: unknown = JSON.parse(text);
        const result = generatedBatchSchema.parse(parsed);
        if (result.questions.some((question) => question.part !== input.part || question.difficulty !== input.difficulty || question.targetScore !== input.targetScore)) throw new Error("AI returned the wrong part or difficulty metadata.");
        return result.questions;
      } catch (error) {
        if (error instanceof AiProviderUnavailableError) throw error;
        lastError = error;
      }
    }
    throw new AiProviderUnavailableError(lastError instanceof Error ? `AI 回傳格式未通過驗證：${lastError.message}` : undefined);
  }
}

function extractText(payload: unknown) {
  const candidate = payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = candidate.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  if (!text) throw new Error("Gemini did not return any content.");
  return text;
}
