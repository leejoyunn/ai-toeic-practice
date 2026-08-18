import type { AttemptStat } from "@/lib/toeic/statistics/calculate";
import type { MasteryEvidence } from "@/lib/toeic/recommendation/weakness";

export interface EstimatedLevel { value:number; label:string; source:"user"|"estimated"; disclaimer:string }
export function estimateLevel(attempts: AttemptStat[], mastery: MasteryEvidence[], userLevel: number): EstimatedLevel {
  const disclaimer = "此程度為系統依練習表現估計，不代表正式 TOEIC 成績。";
  if (attempts.length < 30) return { value:userLevel, label:`約 ${roundStage(userLevel)}`, source:"user", disclaimer };
  const recent = attempts.slice(0, 50), accuracy = recent.filter((row) => row.is_correct).length / recent.length;
  const hardShare = recent.filter((row) => row.difficulty === "hard" && row.is_correct).length / recent.length;
  const stable = mastery.filter((row) => ["familiar","mastered"].includes(row.mastery_level)).length / Math.max(1, mastery.length);
  const raw = 350 + accuracy * 190 + hardShare * 90 + stable * 45;
  const value = Math.max(400, Math.min(550, roundStage(raw)));
  return { value, label:value >= 550 ? "接近 550" : `約 ${value}`, source:"estimated", disclaimer };
}
function roundStage(value:number) { return Math.round(value / 50) * 50; }

export function learningStage(level:number, recentAccuracy:number|null, vocabularyFamiliarity:number) {
  if (level >= 540 && (recentAccuracy ?? 0) >= 75 && vocabularyFamiliarity >= 60) return { id:"D", title:"550 目標準備", focus:"整合上下文、同義改寫與推論" };
  if (level >= 490 && (recentAccuracy ?? 0) >= 65) return { id:"C", title:"500 接近目標", focus:"增加合理干擾選項與較長句" };
  if (level >= 440 && (recentAccuracy ?? 0) >= 55) return { id:"B", title:"450 穩定基礎", focus:"穩定文法並加入間接回答與 context" };
  return { id:"A", title:"400 基礎補強", focus:"基礎詞性、時態、介系詞與直接聽力線索" };
}
