import { NextResponse } from "next/server";
import { attemptRequestSchema } from "@/lib/ai/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request:Request) {
  try {
    const input=attemptRequestSchema.parse(await request.json());
    const supabase=await createSupabaseServerClient(); if(!supabase)return NextResponse.json({error:"尚未設定 Supabase。"},{status:503});
    const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:"登入狀態已失效，請重新登入。"},{status:401});
    const {data:question,error}=await supabase.from("questions").select("*").eq("id",input.questionId).eq("user_id",user.id).single();
    if(error||!question)return NextResponse.json({error:"找不到這道題目。"},{status:404});
    const isCorrect=input.selectedAnswer===question.correct_answer;
    const {data:attempt,error:attemptError}=await supabase.from("attempts").insert({user_id:user.id,question_id:question.id,selected_answer:input.selectedAnswer,correct_answer:question.correct_answer,is_correct:isCorrect,part:question.part,grammar_point:question.grammar_point,topic:question.topic,difficulty:question.difficulty}).select("id").single();
    if(attemptError)throw new Error(`儲存作答失敗：${attemptError.message}`);
    if(!isCorrect) {
      const {error:wrongAnswerError}=await supabase.from("wrong_answers").upsert({user_id:user.id,question_id:question.id,first_attempt_id:attempt.id,wrong_count:1,last_wrong_at:new Date().toISOString(),next_review_at:new Date(Date.now()+86400000).toISOString()},{onConflict:"user_id,question_id"});
      if(wrongAnswerError)throw new Error(`儲存錯題失敗：${wrongAnswerError.message}`);
    }
    return NextResponse.json({isCorrect,correctAnswer:question.correct_answer,explanation:question.explanation,translation:question.translation,vocabulary:question.vocabulary,grammarPoint:question.grammar_point});
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:"無法儲存答案，請稍後再試。"},{status:400}); }
}
