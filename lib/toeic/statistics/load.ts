import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateStatistics, type AttemptStat } from "@/lib/toeic/statistics/calculate";

export async function loadStatistics(supabase: SupabaseClient, userId: string) {
  const attempts: AttemptStat[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("attempts").select("part,is_correct,difficulty,answered_at").eq("user_id", userId).order("answered_at", { ascending: false }).range(from, from + 999);
    if (error) throw new Error(`讀取統計失敗：${error.message}`);
    attempts.push(...((data ?? []) as AttemptStat[]));
    if (!data || data.length < 1000) break;
  }
  return { attempts, statistics: calculateStatistics(attempts) };
}
