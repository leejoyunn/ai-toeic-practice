import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSkill } from "@/lib/toeic/mastery/skills";
import { updateSkillMastery } from "@/lib/toeic/mastery/update";
import { estimateMockScore } from "@/lib/toeic/mock-test/score-estimator";

type Difficulty="easy"|"medium"|"hard";
type AnswerRow={question_id:string;selected_answer:string|null;questions:{part:number;correct_answer:string;grammar_point:string|null;question_type:string;topic:string;difficulty:Difficulty}|null};

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params,supabase=await createSupabaseServerClient();
    if(!supabase)return NextResponse.json({error:"尚未設定 Supabase。"},{status:503});
    const{data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"請先登入。"},{status:401});
    const{data:test,error:testError}=await supabase.from("mock_tests").select("*").eq("id",id).eq("user_id",user.id).single();
    if(testError||!test)return NextResponse.json({error:"找不到模擬考。"},{status:404});
    if(test.status==="completed"&&test.result_processed)return NextResponse.json({ok:true,id});
    if(test.status!=="active")return NextResponse.json({error:"這份模擬考目前無法交卷。"},{status:409});
    const{data,error}=await supabase.from("mock_test_answers").select("question_id,selected_answer,questions(part,correct_answer,grammar_point,question_type,topic,difficulty)").eq("mock_test_id",id).eq("user_id",user.id).order("position");
    if(error)throw new Error(`讀取答案失敗：${error.message}`);
    const answers=(data??[])as unknown as AnswerRow[];
    if(answers.length!==test.question_count)throw new Error("題目尚未準備完整，暫時不能交卷。");
    let listeningCorrect=0,readingCorrect=0;
    const partStats:Record<string,{attempts:number;correct:number}>={};
    for(const answer of answers){
      const question=answer.questions;if(!question)throw new Error("題目資料不完整。");
      const isCorrect=answer.selected_answer!==null&&answer.selected_answer===question.correct_answer;
      const{error:answerError}=await supabase.from("mock_test_answers").update({is_correct:isCorrect}).eq("mock_test_id",id).eq("question_id",answer.question_id).eq("user_id",user.id);
      if(answerError)throw new Error(`整理答案失敗：${answerError.message}`);
      if(isCorrect){if(question.part<=4)listeningCorrect++;else readingCorrect++;}
      const key=String(question.part),stat=partStats[key]??{attempts:0,correct:0};stat.attempts++;if(isCorrect)stat.correct++;partStats[key]=stat;
      const skill=normalizeSkill(question.part,question.grammar_point,question.question_type);
      const{data:existingAttempt}=await supabase.from("attempts").select("id,mock_processing_stage").eq("mock_test_id",id).eq("question_id",answer.question_id).eq("user_id",user.id).maybeSingle();
      let attempt=existingAttempt;
      if(!attempt){
        const{data:created,error:attemptError}=await supabase.from("attempts").insert({user_id:user.id,question_id:answer.question_id,mock_test_id:id,mock_processing_stage:0,selected_answer:answer.selected_answer??"UNANSWERED",correct_answer:question.correct_answer,is_correct:isCorrect,part:question.part,grammar_point:skill,topic:question.topic,difficulty:question.difficulty}).select("id,mock_processing_stage").single();
        if(attemptError)throw new Error(`整理作答紀錄失敗：${attemptError.message}`);attempt=created;
      }
      if(attempt.mock_processing_stage<1){
        if(!isCorrect){
          const{data:wrong}=await supabase.from("wrong_answers").select("first_attempt_id,wrong_count").eq("user_id",user.id).eq("question_id",answer.question_id).maybeSingle();
          const{error:wrongError}=await supabase.from("wrong_answers").upsert({user_id:user.id,question_id:answer.question_id,first_attempt_id:wrong?.first_attempt_id??attempt.id,wrong_count:(wrong?.wrong_count??0)+1,resolved:false,last_wrong_at:new Date().toISOString(),next_review_at:new Date(Date.now()+86400000).toISOString()},{onConflict:"user_id,question_id"});
          if(wrongError)throw new Error(`整理錯題失敗：${wrongError.message}`);
        }
        const{error:stageError}=await supabase.from("attempts").update({mock_processing_stage:1}).eq("id",attempt.id).eq("user_id",user.id);if(stageError)throw new Error(stageError.message);
      }
      if(attempt.mock_processing_stage<2){
        await updateSkillMastery(supabase,user.id,skill,isCorrect);
        const{error:stageError}=await supabase.from("attempts").update({mock_processing_stage:2}).eq("id",attempt.id).eq("user_id",user.id);if(stageError)throw new Error(stageError.message);
      }
    }
    const listeningRows=answers.filter(a=>(a.questions?.part??9)<=4),readingRows=answers.filter(a=>(a.questions?.part??0)>=5),difficultyValue=(value:Difficulty)=>value==="hard"?1.2:value==="medium"?1.1:1,average=(rows:AnswerRow[])=>rows.length?rows.reduce((sum,a)=>sum+difficultyValue(a.questions?.difficulty??"easy"),0)/rows.length:1;
    const score=estimateMockScore({listening:{correct:listeningCorrect,total:listeningRows.length,averageDifficulty:average(listeningRows)},reading:{correct:readingCorrect,total:readingRows.length,averageDifficulty:average(readingRows)},kind:test.kind,questionCount:test.question_count}),totalCorrect=listeningCorrect+readingCorrect;
    const metadata={...test.generation_metadata,partStats,score};
    const{error:updateError}=await supabase.from("mock_tests").update({status:"completed",submitted_at:new Date().toISOString(),remaining_seconds:0,listening_correct:listeningCorrect,reading_correct:readingCorrect,total_correct:totalCorrect,listening_score_estimate:midpoint(score.listening.low,score.listening.high),reading_score_estimate:midpoint(score.reading.low,score.reading.high),total_score_estimate:midpoint(score.total.low,score.total.high),generation_metadata:metadata,result_processed:true}).eq("id",id).eq("user_id",user.id);
    if(updateError)throw new Error(`完成交卷失敗：${updateError.message}`);
    return NextResponse.json({ok:true,id});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:"交卷失敗，已保留答案，請重試。"},{status:400});
  }
}
function midpoint(low:number,high:number){return Math.round((low+high)/2/5)*5;}
