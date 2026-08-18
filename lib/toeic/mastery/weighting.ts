import type { MasteryLevel } from "@/lib/toeic/mastery/config";

export interface MasteryWeightRow {
  skill_id: string;
  recent_accuracy: number | string | null;
  mastery_level: MasteryLevel | null;
  consecutive_correct: number | null;
  consecutive_wrong: number | null;
  last_practiced_at: string | null;
}

const LEVEL_WEIGHT: Record<MasteryLevel, number> = {
  learning: 100,
  improving: 70,
  familiar: 35,
  mastered: 12,
};

export function rankMasterySkills(rows: MasteryWeightRow[], part: number, now = Date.now()) {
  const relevantRows = rows.filter((row) => part === 5 ? !row.skill_id.startsWith("part_") : row.skill_id.startsWith(`part_${part}_`));
  return relevantRows.map((row) => {
    const level = row.mastery_level ?? "learning";
    const accuracy = Number(row.recent_accuracy ?? 0);
    const daysSincePractice = row.last_practiced_at
      ? Math.max(0, (now - new Date(row.last_practiced_at).getTime()) / 86_400_000)
      : 30;
    const score = LEVEL_WEIGHT[level]
      + (100 - accuracy) * 0.65
      + Math.min(35, daysSincePractice * 1.5)
      + (row.consecutive_wrong ?? 0) * 14
      - Math.min(15, (row.consecutive_correct ?? 0) * 3);
    return { ...row, mastery_level: level, score };
  }).sort((a, b) => b.score - a.score);
}
