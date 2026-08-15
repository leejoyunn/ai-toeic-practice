import type { Difficulty, ReadingPart } from "@/types/toeic";

export interface DifficultyContext { currentEstimatedLevel:number; targetScore:number; recentAccuracy:number|null; weakSkillAccuracy:number|null; requested?:Difficulty; }
export interface DifficultyRecommendation { difficulty:Difficulty; workingLevel:number; reason:string; focus:string[]; }

export function recommendDifficulty(context: DifficultyContext): DifficultyRecommendation {
  const accuracy = context.weakSkillAccuracy ?? context.recentAccuracy ?? 0.6;
  let workingLevel = Math.min(context.targetScore, context.currentEstimatedLevel + 50);
  if (accuracy < 0.45) workingLevel = Math.max(300, context.currentEstimatedLevel - 40);
  else if (accuracy >= 0.82) workingLevel = Math.min(context.targetScore, context.currentEstimatedLevel + 90);
  const calculated: Difficulty = workingLevel < 470 ? "easy" : workingLevel < 580 ? "medium" : "hard";
  const difficulty = context.requested && !(accuracy < 0.45 && context.requested === "hard") ? context.requested : calculated;
  return { difficulty, workingLevel, reason: accuracy < 0.45 ? "近期基礎考點仍不穩，先使用短句與清楚線索。" : accuracy >= 0.82 ? "近期表現穩定，逐步增加干擾選項與上下文。" : "維持可理解、略有挑戰的題目。", focus:["TOEIC 高頻基礎單字","詞性與基本時態","清楚的上下文線索"] };
}

export function partGuidance(part: ReadingPart) {
  if (part === 5) return "每題為單一句子四選一，優先考詞性、基本時態、主被動、介系詞、連接詞。";
  if (part === 6) return "每題必須有一篇完整短文，考單字、文法、句子插入或上下文；不要只給單一句子。";
  return "每題必須有完整原創文章，可用 Email、Notice、Advertisement、Message、Schedule 等，考明確資訊、同義改寫或簡單推論。";
}
