export interface SimilarityThresholds{primary:number;combined:number;jaccard:number;bigram:number;trigram:number;levenshtein:number}

const near:Record<number,SimilarityThresholds>={
  1:{primary:.995,combined:.94,jaccard:.92,bigram:.94,trigram:.95,levenshtein:.98},
  2:{primary:.965,combined:.93,jaccard:.90,bigram:.94,trigram:.95,levenshtein:.97},
  3:{primary:.94,combined:.91,jaccard:.86,bigram:.89,trigram:.90,levenshtein:.95},
  4:{primary:.94,combined:.91,jaccard:.86,bigram:.89,trigram:.90,levenshtein:.95},
  5:{primary:.94,combined:.91,jaccard:.87,bigram:.90,trigram:.91,levenshtein:.95},
  6:{primary:.93,combined:.90,jaccard:.85,bigram:.88,trigram:.89,levenshtein:.94},
  7:{primary:.93,combined:.90,jaccard:.85,bigram:.88,trigram:.89,levenshtein:.94},
};
const raise=(value:SimilarityThresholds,amount:number):SimilarityThresholds=>({primary:Math.min(.999,value.primary+amount),combined:Math.min(.99,value.combined+amount),jaccard:Math.min(.99,value.jaccard+amount),bigram:Math.min(.99,value.bigram+amount),trigram:Math.min(.995,value.trigram+amount),levenshtein:Math.min(.999,value.levenshtein+amount)});

export const SIMILARITY_CONFIG={recentQuestionLimit:500,maxGenerationRounds:3,levenshteinPrefilter:.55,levenshteinMaxLength:1400,rotationWindow:60,promptAvoidLimit:12}as const;
export function thresholdsFor(part:number,recentIndex:number|null,batch=false){const base=near[part]??near[5];if(batch)return base;if(recentIndex===null||recentIndex<50)return base;if(recentIndex<200)return raise(base,.025);return raise(base,.05);}
export function recencyTier(index:number|null){return index===null?"batch":index<50?"recent_1_50":index<200?"recent_51_200":"recent_201_500";}
export const DUPLICATE_EXHAUSTED_MESSAGE="這次產生的題目與近期內容太相似，請稍後再試。";
