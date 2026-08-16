import { NextResponse } from "next/server";
import { generationRequestSchema, type GeneratedQuestion } from "@/lib/ai/schema";
import { AiProviderUnavailableError, getAiProvider } from "@/lib/ai/provider";
import { recommendDifficulty } from "@/lib/toeic/difficulty";
import { createQuestionHash, isQuestionTooSimilar, SIMILARITY_CONFIG } from "@/lib/similarity/question-similarity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRecentQuestions, saveGeneratedQuestions, toPublicQuestion } from "@/lib/supabase/questions";

export async function POST(request:Request) {
  try {
    const input = generationRequestSchema.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    if (!supabase) return NextResponse.json({error:"尚未設定 Supabase，請先完成 .env.local。"},{status:503});
    const {data:{user}} = await supabase.auth.getUser();
    if (!user) return NextResponse.json({error:"請先使用 Google 登入，再開始 AI 練習。"},{status:401});

    const [{data:profile},{data:recentAttempts},{data:mastery},recentQuestions] = await Promise.all([
      supabase.from("profiles").select("current_estimated_level,target_score").eq("id",user.id).maybeSingle(),
      supabase.from("attempts").select("is_correct").eq("user_id",user.id).eq("part",input.part).order("answered_at",{ascending:false}).limit(30),
      supabase.from("skill_mastery").select("skill_id,recent_accuracy").eq("user_id",user.id).order("recent_accuracy",{ascending:true}).limit(5),
      getRecentQuestions(supabase,user.id,input.part,SIMILARITY_CONFIG.recentQuestionLimitPhase2),
    ]);
    const recentAccuracy = recentAttempts?.length ? recentAttempts.filter((item)=>item.is_correct).length/recentAttempts.length : null;
    const currentEstimatedLevel = profile?.current_estimated_level ?? 400;
    const targetScore = input.targetScore ?? profile?.target_score ?? 550;
    const strategy = recommendDifficulty({currentEstimatedLevel,targetScore,recentAccuracy,weakSkillAccuracy:mastery?.[0]?.recent_accuracy ? Number(mastery[0].recent_accuracy)/100:null,requested:input.difficulty});
    const provider = getAiProvider();
    const accepted:Array<GeneratedQuestion & {questionHash:string}> = [];
    const existingHashes = new Set(recentQuestions.map((question)=>question.question_hash));

    for (let generationRound=0; generationRound<2 && accepted.length<input.count; generationRound+=1) {
      const generated = await provider.generateQuestions({part:input.part,count:input.part>=6?input.count:Math.min(10,input.count-accepted.length+2),targetScore,currentEstimatedLevel,difficulty:strategy.difficulty,passageMode:input.passageMode,
        weakSkills:mastery?.map((item)=>item.skill_id)??strategy.focus,recentScenarios:[...new Set([...recentQuestions.map((q)=>q.scenario),...accepted.map((q)=>q.scenario)])].slice(0,12),
        recentVocabularyDomains:[...new Set(recentQuestions.map((q)=>q.vocabulary_domain))].slice(0,10),recentSentencePatterns:[...new Set(recentQuestions.map((q)=>q.sentence_pattern))].slice(0,10)});
      const hashed = await Promise.all(generated.map(async(question)=>({question,questionHash:await createQuestionHash(question)})));
      const {data:historicDuplicates}=await supabase.from("questions").select("question_hash").eq("user_id",user.id).in("question_hash",hashed.map((item)=>item.questionHash));
      historicDuplicates?.forEach((item)=>existingHashes.add(item.question_hash));
      for (const {question,questionHash} of hashed) {
        if (accepted.length>=input.count) break;
        if (existingHashes.has(questionHash)) continue;
        const comparisonPool=[...recentQuestions,...accepted].filter((item)=>!("passageGroupId" in item&&item.passageGroupId===question.passageGroupId));
        if (isQuestionTooSimilar(question,comparisonPool,accepted.length?SIMILARITY_CONFIG.batchThreshold:SIMILARITY_CONFIG.recentThreshold)) continue;
        const sameGroup=accepted.some((item)=>item.passageGroupId===question.passageGroupId);
        if (!sameGroup&&accepted.some((item)=>item.scenario===question.scenario&&item.sentencePattern===question.sentencePattern)) continue;
        const previous=accepted.at(-1);
        if(previous && previous.passageGroupId!==question.passageGroupId && (previous.scenario===question.scenario || previous.vocabulary[0]?.word.toLowerCase()===question.vocabulary[0]?.word.toLowerCase())) continue;
        existingHashes.add(questionHash); accepted.push({...question,questionHash});
      }
    }
    if (!accepted.length) return NextResponse.json({error:"這批題目和近期內容太相似，系統已阻擋顯示。請再試一次。"},{status:422});

    const stored=await saveGeneratedQuestions(supabase,user.id,provider.name,accepted);
    const {data:session,error:sessionError}=await supabase.from("practice_sessions").insert({user_id:user.id,mode:"self_selected",status:"active",part:input.part,requested_count:stored.length,difficulty:strategy.difficulty,target_score:targetScore,settings:{workingLevel:strategy.workingLevel,strategyReason:strategy.reason}}).select("id").single();
    if(sessionError) throw new Error(`建立練習紀錄失敗：${sessionError.message}`);
    await supabase.from("practice_session_questions").insert(stored.map((question,index)=>({session_id:session.id,question_id:question.id,position:index+1})));
    return NextResponse.json({sessionId:session.id,questions:stored.map(toPublicQuestion),strategy,generatedCount:stored.length});
  } catch(error) {
    if(error instanceof AiProviderUnavailableError) return NextResponse.json({error:error.message},{status:503});
    const message=error instanceof Error?error.message:"目前無法產生新題目，請稍後再試。";
    return NextResponse.json({error:message},{status:400});
  }
}
