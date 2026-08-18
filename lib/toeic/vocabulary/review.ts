export type VocabularyFamiliarity = "learning"|"improving"|"familiar"|"mastered";
export type ReviewRating = 0|1|2;
export const VOCABULARY_BATCH_TARGETS = { 5:2, 10:3 } as const;

export function reviewOutcome(rating:ReviewRating, previous:VocabularyFamiliarity, now=new Date()) {
  let familiarity:VocabularyFamiliarity, days:number;
  if (rating===0) { familiarity="learning"; days=1; }
  else if (rating===1) { familiarity=previous==="learning"?"improving":previous; days=3; }
  else if (previous==="familiar"||previous==="mastered") { familiarity="mastered"; days=14; }
  else { familiarity="familiar"; days=7; }
  return { familiarity, nextReviewAt:new Date(now.getTime()+days*86_400_000).toISOString(), correct:rating>0 };
}

export function vocabularyTargetLimit(count:number){return count>=10?VOCABULARY_BATCH_TARGETS[10]:VOCABULARY_BATCH_TARGETS[5];}
