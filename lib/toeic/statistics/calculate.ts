import { calculateStreak, dateRange, studyDate } from "@/lib/toeic/statistics/date";

export interface AttemptStat { part: number; is_correct: boolean; difficulty: string; answered_at: string }
export interface DailyStat { date: string; completed: number; correct: number; accuracy: number | null }

export function calculateStatistics(attempts: AttemptStat[], now = new Date()) {
  const todayKey = studyDate(now);
  const todayAttempts = attempts.filter((attempt) => studyDate(attempt.answered_at) === todayKey);
  const partStats = Array.from({ length: 7 }, (_, index) => {
    const part = index + 1;
    const rows = attempts.filter((attempt) => attempt.part === part);
    const recent = rows.slice(0, 20);
    return { part, attempts: rows.length, accuracy: rate(rows), recentAccuracy: rate(recent) };
  });
  return {
    today: { completed: todayAttempts.length, correct: todayAttempts.filter((row) => row.is_correct).length, accuracy: rate(todayAttempts) },
    total: { completed: attempts.length, correct: attempts.filter((row) => row.is_correct).length, accuracy: rate(attempts) },
    streak: calculateStreak(attempts.map((row) => row.answered_at), now),
    partStats,
    days7: daily(attempts, 7, now), days30: daily(attempts, 30, now),
  };
}

function daily(attempts: AttemptStat[], days: number, now: Date): DailyStat[] {
  return dateRange(days, now).map((date) => {
    const rows = attempts.filter((attempt) => studyDate(attempt.answered_at) === date);
    return { date, completed: rows.length, correct: rows.filter((row) => row.is_correct).length, accuracy: rate(rows) };
  });
}
function rate(rows: AttemptStat[]) { return rows.length ? rows.filter((row) => row.is_correct).length / rows.length * 100 : null; }
