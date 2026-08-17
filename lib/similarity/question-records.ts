import type{GeneratedQuestion}from"@/lib/ai/schema";
import type{GeneratedListeningQuestion}from"@/lib/ai/listening-schema";
import type{SimilarityRecord}from"@/lib/similarity/fingerprint";

export function readingToSimilarityRecord(question:GeneratedQuestion):SimilarityRecord{return{part:question.part,question:question.question,options:question.options,passage:question.passage,passageType:question.passageType,documents:question.documents,grammarPoint:question.grammarPoint,sentencePattern:question.sentencePattern,scenario:question.scenario,groupId:question.passageGroupId};}
export function listeningToSimilarityRecord(question:GeneratedListeningQuestion):SimilarityRecord{return{part:question.part,question:question.question,options:question.options,transcript:question.transcript,grammarPoint:question.skill,sentencePattern:question.sentencePattern,scenario:question.scenario,groupId:question.audioGroupId,image:question.image?{id:question.image.id,scene:question.image.scene,actions:question.image.actions}:null};}
