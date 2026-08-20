import { z } from "zod";
import { generatedBatchSchema, type GeneratedQuestion } from "@/lib/ai/schema";
import { AiProviderUnavailableError, type AiProvider, type GenerateQuestionsInput } from "@/lib/ai/provider";
import { partGuidance } from "@/lib/toeic/difficulty";

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_MODEL_FALLBACKS = [DEFAULT_GEMINI_MODEL, "gemini-3.1-flash-lite"] as const;
const MODEL_UNAVAILABLE_MESSAGE = "目前 Gemini 模型已停用或不可用，請更新 GEMINI_MODEL。";

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
        required: ["part","questionType","question","options","correctAnswer","explanation","translation","vocabulary","grammarPoint","topic","scenario","vocabularyDomain","sentencePattern","difficulty","targetScore","keywords","passage","passageType","passageGroupId","blankNumber","documents"],
        properties: {
          part: { type: "integer", enum: [5,6,7] }, questionType: { type: "string" }, question: { type: "string" },
          options: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", required: ["id","text"], properties: { id: { type: "string", enum: ["A","B","C","D"] }, text: { type: "string" } } } },
          correctAnswer: { type: "string", enum: ["A","B","C","D"] }, explanation: { type: "string" }, translation: { type: "string" },
          vocabulary: { type: "array", minItems: 1, maxItems: 8, items: { type: "object", required: ["word","chineseMeaning","partOfSpeech"], properties: { word:{type:"string"}, chineseMeaning:{type:"string"}, partOfSpeech:{type:"string"}, simpleExample:{type:"string"}, exampleTranslation:{type:"string"}, commonCollocations:{type:"array",items:{type:"string"}} } } },
          grammarPoint:{type:"string"}, topic:{type:"string"}, scenario:{type:"string"}, vocabularyDomain:{type:"string"}, sentencePattern:{type:"string"},
          difficulty:{type:"string",enum:["easy","medium","hard"]}, targetScore:{type:"integer"}, keywords:{type:"array",items:{type:"string"}},
          passage:{type:["string","null"]}, passageType:{type:["string","null"]},
          passageGroupId:{type:["string","null"]}, blankNumber:{type:["integer","null"]},
          documents:{type:"array",maxItems:3,items:{type:"object",required:["id","label","type","content"],properties:{id:{type:"string"},label:{type:"string"},type:{type:"string"},content:{type:"string"}}}},
        },
      },
    },
  },
};

function buildPrompt(input: GenerateQuestionsInput, retryNote = "") {
  const passageMode = input.passageMode ?? (input.difficulty === "hard" ? "triple" : input.difficulty === "medium" ? "double" : "single");
  const part7TypeCount=Math.min(3,input.count);
  return `你是專門協助繁體中文初學者的 TOEIC Reading 教材編寫老師。請生成 ${input.count} 題完全原創、非官方考題的 Part ${input.part} 四選一練習題。

學習者目前估計程度：${input.currentEstimatedLevel}。目標分數：${input.targetScore}。本批難度：${input.difficulty}。
Part 規格：${partGuidance(input.part)}
弱項參考：${input.weakSkills.join("、") || "基礎文法與高頻字彙"}
近期尚未熟悉單字：${input.targetVocabulary?.join("、")||"無"}。若語意與 TOEIC 情境自然，可在整批少量使用；不可硬塞，也不可每題重複同一字。
最近已用情境（本批盡量避開）：${input.recentScenarios.join("、") || "無"}
最近字彙領域（本批輪替）：${input.recentVocabularyDomains.join("、") || "無"}
最近句型（本批不得只換主詞重做）：${input.recentSentencePatterns.join("、") || "無"}
優先情境：${input.rotation?.preferredScenarios.join("、")||"依題意輪替"}
優先考點：${input.rotation?.preferredSkills.join("、")||"依弱項與 Part 選擇"}
近期過度集中，請降低權重：情境 ${input.rotation?.avoidScenarios.join("、")||"無"}；考點 ${input.rotation?.avoidSkills.join("、")||"無"}；主題 ${input.rotation?.avoidTopics.join("、")||"無"}
本次重生必須修正：${input.regenerateGuidance?.join("；")||"無"}

強制品質規則：
1. 每題只有一個合理最佳答案，A/B/C/D 各出現一次。
   Part 5 的四個選項必須是真實存在的英文單字、標準屈折變化或合理片語；禁止拼錯字、虛構字（例如 carenss）與荒謬到一眼可排除的干擾選項。干擾選項也要在詞性或語意上具有迷惑性。
2. explanation 使用繁體中文、短句、白話，說明「為什麼這個答案對」及「其他選項為什麼不適合」，英文很弱也能懂。
3. translation 是題目全文（Part 6/7 含文章）的完整繁體中文翻譯。
   所有 passage、documents、question、options 必須是英文；繁體中文只能出現在 explanation、translation 與 vocabulary 的中文欄位。
4. vocabulary 至少列 1 個重要字，包含中文與詞性。
5. Part 5 的 passage、passageType 必須為 null；Part 6/7 必須有完整 passage 與 passageType。
   Part 6：本批 ${input.count} 題必須共用同一篇完整 passage 與同一 passageGroupId，passage 依序包含 ${Array.from({length:input.count},(_,index)=>`(${index+1}) ____`).join("、")}；每題 blankNumber 各自對應一個空格。question 不可重複 passage 或包含選項，只能是簡短提示。documents 填一份與 passage 相同內容的文件。questionType 要混合 vocabulary、grammar、sentence_insertion、context。每一題都必須重複填入同一篇文章的完整繁體中文 translation，不得只有第一題有翻譯、其餘留空。
   Part 7：本批題目必須共用同一 passageGroupId 與同一組 documents；本次模式是 ${passageMode} passage，documents 必須真的包含 ${passageMode==="single"?1:passageMode==="double"?2:3} 份類型不同但資訊互相關聯的完整文件，passageType 填 ${passageMode}_passage，passage 填所有文件的可讀合併文字。不可把單篇任意切段假裝多篇。questionType 從 detail、main_purpose、paraphrase、inference、vocabulary_in_context、cross_document 選擇；Single 不可用 cross_document。本批共 ${input.count} 題，至少必須使用 ${part7TypeCount} 種不同 questionType，不可全部相同，也不可只使用 ${Math.max(1,part7TypeCount-1)} 種。Easy 以 detail 為主但至少一題 paraphrase；Medium 增加 paraphrase/inference；Hard 與多文件必須包含 inference/cross_document。
6. 每題都要有 grammarPoint、topic、scenario、vocabularyDomain、sentencePattern、keywords、difficulty、targetScore。
7. 同一批題目必須輪替情境、核心單字、主詞、句型與考點；優先採用「優先情境／優先考點」，降低近期過度集中項目的權重；不得產生只有替換人名或名詞的近似題。
8. 不得引用、改寫或聲稱來自 ETS／TOEIC 官方考題。
9. targetScore 請填 ${input.targetScore}，part 請填 ${input.part}，difficulty 請填 ${input.difficulty}。
10. 只輸出 JSON，不要加 Markdown。JSON 必須符合這份結構：${JSON.stringify(RESPONSE_SCHEMA)}
${retryNote}`;
}

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  async generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.AI_API_KEY;
    if (!apiKey) throw new AiProviderUnavailableError("尚未設定 Gemini API Key，請先完成環境變數設定。");
    const configuredModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
    const models = [configuredModel, ...GEMINI_MODEL_FALLBACKS.filter((model) => model !== configuredModel)];
    let lastError: unknown;
    let lastValidationMessage = "";
    let unavailableModels = 0;
    for (const model of models) {
      let modelUnavailable=false;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              contents: [{ parts: [{ text: buildPrompt(input, attempt ? `前次輸出未通過格式或品質驗證。實際原因：${lastValidationMessage||"未知格式錯誤"}。請針對這個原因修正整批後重新生成。` : "") }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
            signal: AbortSignal.timeout(45_000),
          });
          if (!response.ok) {
            const detail = await response.text();
            if ([401,403].includes(response.status)) throw new AiProviderUnavailableError("Gemini API Key 無效或沒有使用權限，請檢查設定。");
            if (response.status === 429) throw new AiProviderUnavailableError("Gemini 免費額度目前忙碌，請稍後再試。");
            if (isModelUnavailable(response.status, detail)) {
              unavailableModels += 1;
              modelUnavailable=true;
              lastError = new Error(`${MODEL_UNAVAILABLE_MESSAGE}（${model}）`);
              break;
            }
            throw new Error(`Gemini ${response.status}: ${detail.slice(0, 300)}`);
          }
          const payload: unknown = await response.json();
          const text = extractText(payload);
          const parsed: unknown = JSON.parse(text);
          const result = generatedBatchSchema.parse(Array.isArray(parsed) ? { questions: parsed } : parsed);
          if (result.questions.some((question) => question.part !== input.part || question.difficulty !== input.difficulty || question.targetScore !== input.targetScore)) throw new Error("AI returned the wrong part or difficulty metadata.");
          if (result.questions.length !== input.count) throw new Error(`AI 題數不符：預期 ${input.count} 題，實際 ${result.questions.length} 題。`);
          if (input.part >= 6 && new Set(result.questions.map((question) => question.passageGroupId)).size !== 1) throw new Error(`Part ${input.part} 本批題目必須共用同一文章群組。`);
          if (input.part === 5) await validatePart5Options(result.questions, model, apiKey);
          return result.questions;
        } catch (error) {
          if (error instanceof AiProviderUnavailableError) throw error;
          lastError = error;
          lastValidationMessage=error instanceof Error?error.message:"未知格式錯誤";
        }
      }
      if(!modelUnavailable)throw new AiProviderUnavailableError(lastError instanceof Error ? `AI 回傳格式未通過驗證：${lastError.message}` : undefined);
    }
    if (unavailableModels === models.length) throw new AiProviderUnavailableError(MODEL_UNAVAILABLE_MESSAGE);
    throw new AiProviderUnavailableError(lastError instanceof Error ? `AI 回傳格式未通過驗證：${lastError.message}` : undefined);
  }

  async generateListeningQuestions(): Promise<never> {
    throw new AiProviderUnavailableError("請透過 Listening provider 產生聽力題目。");
  }
}

const optionReviewSchema = z.object({ valid: z.boolean(), invalidOptions: z.array(z.string()), reason: z.string() });

async function validatePart5Options(questions: GeneratedQuestion[], model: string, apiKey: string) {
  const suspicious = questions.flatMap((question) => question.options.map((option) => option.text)).filter(hasObviouslyInvalidSpelling);
  if (suspicious.length) throw new Error(`Part 5 選項含明顯無效拼字：${suspicious.join("、")}`);
  const reviewResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `你是英文編輯。檢查以下 TOEIC Part 5 題目的所有選項。只要有不存在、拼錯、虛構的英文單字、不合理的文法形式，或荒謬到一眼可排除的干擾選項，valid 必須為 false。標準屈折變化與常見片語可接受。只輸出 {"valid":boolean,"invalidOptions":string[],"reason":string}。\n${JSON.stringify(questions.map(({question,options})=>({question,options})))}` }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!reviewResponse.ok) throw new Error(`Part 5 選項品質審核失敗（Gemini ${reviewResponse.status}）。`);
  const reviewPayload: unknown = await reviewResponse.json();
  const parsedReview: unknown = JSON.parse(extractText(reviewPayload));
  const review = optionReviewSchema.parse(Array.isArray(parsedReview) ? parsedReview[0] : parsedReview);
  if (!review.valid) throw new Error(`Part 5 選項品質未通過：${review.reason}`);
}

function hasObviouslyInvalidSpelling(option: string) {
  return option.split(/[^A-Za-z'-]+/u).filter(Boolean).some((word) => /([a-z])\1\1/i.test(word) || /nss$/i.test(word) || /q(?!u)/i.test(word) || /(?:ly){2,}$|(?:ness){2,}$/i.test(word));
}

function isModelUnavailable(status: number, detail: string) {
  return status === 404 || (status === 400 && /model.*(?:unavailable|not found|not supported|deprecated)/i.test(detail));
}

function extractText(payload: unknown) {
  const candidate = payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = candidate.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  if (!text) throw new Error("Gemini did not return any content.");
  return text;
}
