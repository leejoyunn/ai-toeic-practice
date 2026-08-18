import { skillLabel } from "@/lib/toeic/statistics/skills";
export const WEAKNESS_MIN_ATTEMPTS = 3;
export interface MasteryEvidence { skill_id:string; attempts:number; recent_accuracy:number|string; mastery_level:string; consecutive_wrong:number; last_practiced_at:string|null }
export function rankWeaknesses(rows: MasteryEvidence[], now = Date.now()) {
  return rows.filter((row) => row.attempts >= WEAKNESS_MIN_ATTEMPTS).map((row) => {
    const accuracy = Number(row.recent_accuracy);
    const staleDays = row.last_practiced_at ? Math.max(0, (now - new Date(row.last_practiced_at).getTime()) / 86_400_000) : 30;
    const level = row.mastery_level;
    const score = (100 - accuracy) * .7 + row.consecutive_wrong * 12 + (level === "learning" ? 18 : level === "improving" ? 10 : 0) + Math.min(12, staleDays * .4) + Math.min(10, row.attempts * .5);
    return { ...row, accuracy, label: skillLabel(row.skill_id), score };
  }).sort((a,b) => b.score - a.score);
}
