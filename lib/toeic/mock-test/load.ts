import type { SupabaseClient } from "@supabase/supabase-js";
import type { MockQuestion,MockTestRow } from "@/lib/toeic/mock-test/types";
import { FULL_LISTENING_SECONDS,FULL_READING_SECONDS } from "@/lib/toeic/mock-test/config";
import { remainingSeconds } from "@/lib/toeic/mock-test/timer";
export async function loadMockTest(supabase:SupabaseClient,userId:string,id:string,includeReview=false){
  const{data:test,error}=await supabase.from("mock_tests").select("*").eq("id",id).eq("user_id",userId).single();if(error||!test)throw new Error("找不到這份模擬考。");
  const reviewFields=includeReview?",correct_answer,explanation,translation,vocabulary,grammar_point":"";
  const{data:answers,error:answerError}=await supabase.from("mock_test_answers").select(`position,selected_answer,is_correct,questions(id,part,question_type,question,options,difficulty,passage,passage_type,transcript,speakers,generation_metadata${reviewFields})`).eq("mock_test_id",id).eq("user_id",userId).order("position");if(answerError)throw new Error(`讀取模擬考題目失敗：${answerError.message}`);
  const questions=(answers??[]).flatMap((row)=>{const question=row.questions as unknown as Omit<MockQuestion,"position"|"selected_answer"|"is_correct">|null;return question?[{...question,position:row.position,selected_answer:row.selected_answer,is_correct:row.is_correct}]:[]});
  const typedTest=test as MockTestRow;
  const sectionDuration=typedTest.kind==="full"?(typedTest.current_section==="listening"?FULL_LISTENING_SECONDS:FULL_READING_SECONDS):typedTest.duration_seconds;
  // Calculate this once on the server and send the exact same value through RSC.
  // Calling Date.now() again during the client's first render can cross a second
  // boundary and produce different timer text during hydration.
  const timerSnapshotSeconds=remainingSeconds(sectionDuration,typedTest.timer_started_at,Date.now(),typedTest.remaining_seconds);
  return{test:typedTest,questions,timerSnapshotSeconds};
}
