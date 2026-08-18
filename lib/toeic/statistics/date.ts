export const STUDY_TIME_ZONE = "Asia/Taipei";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STUDY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});

export function studyDate(value: string | Date = new Date()) {
  return dateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function dateRange(days: number, now = new Date()) {
  const result: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    result.push(studyDate(new Date(now.getTime() - offset * 86_400_000)));
  }
  return result;
}

export function calculateStreak(answeredAt: string[], now = new Date()) {
  const days = new Set(answeredAt.map(studyDate));
  let cursor = new Date(now);
  if (!days.has(studyDate(cursor))) cursor = new Date(cursor.getTime() - 86_400_000);
  let streak = 0;
  while (days.has(studyDate(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return streak;
}
