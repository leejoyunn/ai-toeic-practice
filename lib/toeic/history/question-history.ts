import type{SupabaseClient}from"@supabase/supabase-js";
import type{QuestionOption}from"@/types/toeic";
import type{SimilarityRecord}from"@/lib/similarity/fingerprint";
import{SIMILARITY_CONFIG}from"@/lib/similarity/similarity-config";

export interface QuestionHistoryRow{
  id:string;part:number;question:string;passage:string|null;passage_type:string|null;options:QuestionOption[];question_hash:string;
  grammar_point:string|null;topic:string|null;scenario:string|null;vocabulary_domain:string|null;sentence_pattern:string|null;transcript:string|null;
  generation_metadata:Record<string,unknown>|null;created_at:string;
}

export async function getQuestionHistory(supabase:SupabaseClient,userId:string,part?:number){let query=supabase.from("questions").select("id,part,question,passage,passage_type,options,question_hash,grammar_point,topic,scenario,vocabulary_domain,sentence_pattern,transcript,generation_metadata,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(SIMILARITY_CONFIG.recentQuestionLimit);if(part)query=query.eq("part",part);const{data,error}=await query;if(error)throw new Error(`讀取最近 ${SIMILARITY_CONFIG.recentQuestionLimit} 題失敗：${error.message}`);return(data??[])as QuestionHistoryRow[];}

export function historyToSimilarityRecord(row:QuestionHistoryRow):SimilarityRecord{const metadata=row.generation_metadata??{};const image=isRecord(metadata.image)?metadata.image:null;const documents=Array.isArray(metadata.documents)?metadata.documents.filter(isRecord).flatMap((item)=>typeof item.content==="string"?[{content:item.content}]:[]):undefined;return{part:row.part,question:row.question,options:row.options,passage:row.passage,passageType:row.passage_type,documents,transcript:row.transcript,grammarPoint:row.grammar_point,sentencePattern:row.sentence_pattern,scenario:row.scenario,groupId:metadataGroupId(metadata),image:image&&typeof image.id==="string"&&typeof image.scene==="string"&&Array.isArray(image.actions)?{id:image.id,scene:image.scene,actions:image.actions.filter((item):item is string=>typeof item==="string")}:null};}
function metadataGroupId(metadata:Record<string,unknown>){for(const key of["passageGroupId","audioGroupId"]){if(typeof metadata[key]==="string")return metadata[key]as string;}return null;}
function isRecord(value:unknown):value is Record<string,unknown>{return typeof value==="object"&&value!==null&&!Array.isArray(value);}
