import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeneratedQuestion } from "@/lib/ai/schema";
import type { GeneratedListeningQuestion } from "@/lib/ai/listening-schema";
import type { Difficulty, ToeicPart } from "@/types/toeic";

export interface StoredQuestionRow {
  id:string; user_id:string; part:number; question_type:string; question:string; options:GeneratedQuestion["options"];
  correct_answer:string; explanation:string; translation:string; vocabulary:GeneratedQuestion["vocabulary"]; grammar_point:string;
  difficulty:Difficulty; target_score:number; topic:string; scenario:string; keywords:string[]; vocabulary_domain:string;
  sentence_pattern:string; passage:string|null; passage_type:string|null; question_hash:string; generation_metadata:Record<string,unknown>; created_at:string;
}

export async function getRecentQuestions(supabase: SupabaseClient, userId: string, part: ToeicPart, limit: number) {
  const { data, error } = await supabase.from("questions").select("id,question,passage,options,question_hash,scenario,vocabulary_domain,sentence_pattern").eq("user_id", userId).eq("part", part).order("created_at", { ascending:false }).limit(limit);
  if (error) throw new Error(`讀取近期題目失敗：${error.message}`);
  return (data ?? []) as Array<{id:string;question:string;passage:string|null;options:GeneratedQuestion["options"];question_hash:string;scenario:string;vocabulary_domain:string;sentence_pattern:string}>;
}

export async function saveGeneratedListeningQuestions(supabase:SupabaseClient,userId:string,provider:string,questions:Array<GeneratedListeningQuestion&{questionHash:string}>){
  const rows=questions.map((question)=>({user_id:userId,part:question.part,question_type:question.questionType,question:question.question,options:question.options,correct_answer:question.correctAnswer,explanation:question.explanation,translation:question.translation,vocabulary:question.vocabulary,grammar_point:question.skill,difficulty:question.difficulty,target_score:question.targetScore,topic:question.topic,scenario:question.scenario,keywords:question.keywords,vocabulary_domain:question.vocabularyDomain,sentence_pattern:question.sentencePattern,transcript:question.transcript,speakers:question.speakers,question_hash:question.questionHash,provider,generation_metadata:{phase:3,validated:true,audioGroupId:question.audioGroupId,audioType:question.audioType,dialogue:question.dialogue,image:question.image}}));
  const {data,error}=await supabase.from("questions").insert(rows).select("*");if(error)throw new Error(`儲存 Listening 題目失敗：${error.message}`);return(data??[])as StoredQuestionRow[];
}

export function toPublicListeningQuestion(row:StoredQuestionRow&{transcript?:string;speakers?:unknown}){const metadata=row.generation_metadata??{};return{id:row.id,part:row.part,questionType:row.question_type,question:row.question,options:row.options,difficulty:row.difficulty,targetScore:row.target_score,topic:row.topic,scenario:row.scenario,skill:row.grammar_point,transcript:row.transcript??"",speakers:Array.isArray(row.speakers)?row.speakers:[],audioGroupId:typeof metadata.audioGroupId==="string"?metadata.audioGroupId:null,audioType:typeof metadata.audioType==="string"?metadata.audioType:"listening",dialogue:Array.isArray(metadata.dialogue)?metadata.dialogue:[],image:metadata.image??null};}

export async function saveGeneratedQuestions(supabase: SupabaseClient, userId:string, provider:string, questions:Array<GeneratedQuestion & {questionHash:string}>) {
  const rows = questions.map((question) => ({ user_id:userId, part:question.part, question_type:question.questionType, question:question.question,
    options:question.options, correct_answer:question.correctAnswer, explanation:question.explanation, translation:question.translation, vocabulary:question.vocabulary,
    grammar_point:question.grammarPoint, difficulty:question.difficulty, target_score:question.targetScore, topic:question.topic, scenario:question.scenario,
    keywords:question.keywords, vocabulary_domain:question.vocabularyDomain, sentence_pattern:question.sentencePattern, passage:question.passage,
    passage_type:question.passageType, question_hash:question.questionHash, provider, generation_metadata:{phase:2,validated:true,passageGroupId:question.passageGroupId,blankNumber:question.blankNumber,documents:question.documents} }));
  const { data, error } = await supabase.from("questions").insert(rows).select("*");
  if (error) throw new Error(`儲存題目失敗：${error.message}`);
  return (data ?? []) as StoredQuestionRow[];
}

export function toPublicQuestion(row:StoredQuestionRow) {
  const metadata=row.generation_metadata??{};
  return { id:row.id, part:row.part, questionType:row.question_type, question:row.question, options:row.options, difficulty:row.difficulty,
    targetScore:row.target_score, topic:row.topic, scenario:row.scenario, grammarPoint:row.grammar_point, passage:row.passage, passageType:row.passage_type,
    passageGroupId:typeof metadata.passageGroupId==="string"?metadata.passageGroupId:null,blankNumber:typeof metadata.blankNumber==="number"?metadata.blankNumber:null,
    documents:Array.isArray(metadata.documents)?metadata.documents:[] };
}
