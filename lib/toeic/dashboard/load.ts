import type { SupabaseClient } from "@supabase/supabase-js";
import { loadStatistics } from "@/lib/toeic/statistics/load";
import { rankWeaknesses, type MasteryEvidence } from "@/lib/toeic/recommendation/weakness";
import { buildRecommendations, type PracticeMode } from "@/lib/toeic/recommendation/plan";
import { estimateLevel, learningStage } from "@/lib/toeic/level/estimate";

export async function loadDashboard(supabase:SupabaseClient,userId:string,mode:PracticeMode="all") {
  const [{attempts,statistics},{data:mastery},{data:profile},{data:settings},{count:dueVocabulary},{count:unresolvedWrong},{data:vocabRows}] = await Promise.all([
    loadStatistics(supabase,userId),
    supabase.from("skill_mastery").select("skill_id,attempts,recent_accuracy,mastery_level,consecutive_wrong,last_practiced_at").eq("user_id",userId),
    supabase.from("profiles").select("current_estimated_level,target_score").eq("id",userId).single(),
    supabase.from("user_settings").select("preferred_mode,listening_available").eq("user_id",userId).maybeSingle(),
    supabase.from("user_vocabulary").select("vocabulary_id",{count:"exact",head:true}).eq("user_id",userId).lte("next_review_at",new Date().toISOString()),
    supabase.from("wrong_answers").select("question_id",{count:"exact",head:true}).eq("user_id",userId).eq("resolved",false),
    supabase.from("user_vocabulary").select("familiarity").eq("user_id",userId),
  ]);
  const masteryRows=(mastery??[])as MasteryEvidence[];
  const vocabularyFamiliarity=vocabRows?.length?(vocabRows.filter((row)=>["familiar","mastered"].includes(row.familiarity)).length/vocabRows.length*100):0;
  const estimated=estimateLevel(attempts,masteryRows,profile?.current_estimated_level??400);
  const stage=learningStage(estimated.value,statistics.days7.flatMap((day)=>day.completed?[day.accuracy??0]:[]).at(-1)??statistics.total.accuracy,vocabularyFamiliarity);
  const partAttempts=Object.fromEntries(statistics.partStats.map((row)=>[row.part,row.attempts]));
  const effectiveMode=mode==="all"&&settings?.listening_available===false?"reading":mode;
  return {statistics,mastery:masteryRows,weaknesses:rankWeaknesses(masteryRows),profile:{currentLevel:profile?.current_estimated_level??400,targetScore:profile?.target_score??550},settings,estimated,stage,dueVocabulary:dueVocabulary??0,unresolvedWrong:unresolvedWrong??0,recommendations:buildRecommendations({mastery:masteryRows,partAttempts,dueVocabulary:dueVocabulary??0,unresolvedWrong:unresolvedWrong??0,mode:effectiveMode}),vocabularyFamiliarity};
}
