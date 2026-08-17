import { generatedListeningBatchSchema,type GeneratedListeningQuestion } from "@/lib/ai/listening-schema";
import { AiProviderUnavailableError,type GenerateListeningQuestionsInput } from "@/lib/ai/provider";

const DEFAULT_MODEL="gemini-3.5-flash-lite";

export async function generateGeminiListeningQuestions(input:GenerateListeningQuestionsInput):Promise<GeneratedListeningQuestion[]>{
  const apiKey=process.env.GEMINI_API_KEY??process.env.AI_API_KEY;if(!apiKey)throw new AiProviderUnavailableError("尚未設定 Gemini API Key，無法產生 Listening 題目。");
  const model=process.env.GEMINI_MODEL?.trim()||DEFAULT_MODEL;let lastError:unknown;
  for(let attempt=0;attempt<3;attempt+=1){try{
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},body:JSON.stringify({contents:[{parts:[{text:buildListeningPrompt(input,attempt)}]}],generationConfig:{responseMimeType:"application/json",maxOutputTokens:16384}}),signal:AbortSignal.timeout(90_000)});
    if(!response.ok){const detail=await response.text();if(response.status===429)throw new AiProviderUnavailableError("Gemini 免費額度目前忙碌，請稍後再試。");if(response.status===404)throw new AiProviderUnavailableError("目前 Gemini 模型已停用或不可用，請更新 GEMINI_MODEL。");throw new Error(`Gemini ${response.status}: ${detail.slice(0,240)}`);}
    const payload=await response.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>};const text=payload.candidates?.[0]?.content?.parts?.map((part)=>part.text??"").join("");if(!text)throw new Error("Gemini 未回傳 Listening 內容。");const parsed:unknown=JSON.parse(text);const result=generatedListeningBatchSchema.parse(Array.isArray(parsed)?{questions:parsed}:parsed);
    if(result.questions.length!==input.count||result.questions.some((question)=>question.part!==input.part||question.difficulty!==input.difficulty||question.targetScore!==input.targetScore))throw new Error("Listening 題數或難度 metadata 不正確。");
    if(input.part===1&&(!input.images||result.questions.some((question,index)=>JSON.stringify(question.image)!==JSON.stringify(input.images?.[index]))))throw new Error("Part 1 圖片 metadata 或題目順序不正確。");
    return result.questions;
  }catch(error){if(error instanceof AiProviderUnavailableError)throw error;lastError=error;}}
  throw new AiProviderUnavailableError(lastError instanceof Error?`AI Listening 題目未通過驗證：${lastError.message}`:undefined);
}

function buildListeningPrompt(input:GenerateListeningQuestionsInput,attempt:number){
  const common=`你是 TOEIC Listening 原創教材編寫老師。生成 ${input.count} 題 Part ${input.part}，難度 ${input.difficulty}，目前程度 ${input.currentEstimatedLevel}，目標 ${input.targetScore}。不可複製 ETS 官方題。只輸出 {"questions":[...]} JSON。所有英文必須自然；explanation、translation、vocabulary.chineseMeaning 使用繁體中文且適合英文初學者。每題嚴格使用以下欄位與型別：{"part":${input.part},"questionType":"detail","question":"English prompt","options":[{"id":"A","text":"English option"}],"correctAnswer":"A","explanation":"繁體中文解析","translation":"繁體中文翻譯","vocabulary":[{"word":"schedule","chineseMeaning":"行程","partOfSpeech":"n."}],"skill":"skill_id","difficulty":"${input.difficulty}","targetScore":${input.targetScore},"topic":"topic","scenario":"scenario","vocabularyDomain":"business","sentencePattern":"pattern","keywords":["keyword1","keyword2"],"transcript":"English audio script","speakers":[{"id":"A","name":"Speaker A","voiceRole":"primary"}],"dialogue":[],"audioGroupId":"group-id or null","audioType":"type","image":null}。part 必須是數字 ${input.part}；options 每個項目必須是 {id,text}，不可用純字串；correctAnswer 只能是一個 A/B/C/D 字母；vocabulary 每項一定要有 partOfSpeech。${attempt?"前次未通過 schema，請逐欄修正。":""}`;
  if(input.part===2)return `${common}\nPart 2 Question-Response：每題 transcript 是一個英文 question 或 statement；options 正好 A/B/C 三個自然 response；question 填 Listen and choose the best response.；image=null、dialogue=[]、speakers 一位、audioGroupId 每題不同。skill 從 part2_wh_question、yes_no_question、choice_question、indirect_response、suggestion、request 選擇。Easy 優先常見 Wh/yes-no/request/time/place 與簡單 indirect response。`;
  if(input.part===4)return `${common}\nPart 4 Talks：本批所有題目共用同一 audioGroupId、同一段完整英文 transcript、同一位 speaker、dialogue=[]、image=null。talk 類型從 announcement、voicemail、advertisement、broadcast、guide、business_notice 選擇。一段 talk 對應全部 ${input.count} 題，questionType 混合 detail、main_idea、purpose、inference、next_action。Easy 用短句、明確線索與一般商務情境。`;
  if(input.part===3)return `${common}\nPart 3 Conversations：本批所有題目共用同一 audioGroupId、同一 transcript、相同 speakers 與 dialogue、image=null。至少 speaker A/B，必要時 C；dialogue 至少六個自然 turns，transcript 為含 speaker label 的完整對話。一段 conversation 對應全部 ${input.count} 題，questionType 混合 detail、purpose、next_action、problem、suggestion、inference。`;
  return `${common}\nPart 1 Photographs：以下有 ${input.images?.length??0} 份不同圖片 metadata，必須按照陣列順序每張圖片各生成且只生成一題：${JSON.stringify(input.images)}。第 N 題的 image 必須原樣回傳第 N 份 metadata，不可共用或交換圖片、選項、描述。每題 transcript 是依序朗讀該題 A/B/C/D 四個英文描述的文字；options 正好四個內容不同的英文描述，且只能有一個符合該圖片；question 填 Listen and choose the statement that best describes the photograph.；speakers 一位、dialogue=[]、audioGroupId 每題不同。禁止捏造 metadata 沒有的物件或動作。`;
}
