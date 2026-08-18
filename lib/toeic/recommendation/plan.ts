import type { MasteryEvidence } from "@/lib/toeic/recommendation/weakness";
import { rankWeaknesses } from "@/lib/toeic/recommendation/weakness";
export type PracticeMode = "all"|"reading"|"listening";
export interface Recommendation { kind:"practice"|"vocabulary"|"wrong"; part?:number; title:string; detail:string; count:number; href:string }

export function buildRecommendations(input:{mastery:MasteryEvidence[];partAttempts:Record<number,number>;dueVocabulary:number;unresolvedWrong:number;mode:PracticeMode}) {
  const weaknesses = rankWeaknesses(input.mastery), candidates:Recommendation[] = [];
  for (const weak of weaknesses) {
    const part = inferPart(weak.skill_id);
    if (!allowed(part,input.mode) || candidates.some((item) => item.part === part)) continue;
    const count = weak.accuracy < 45 || weak.consecutive_wrong >= 2 ? 5 : 10;
    candidates.push({kind:"practice",part,title:`Part ${part}｜${weak.label}`,detail:`近期正確率 ${Math.round(weak.accuracy)}% · ${count} 題`,count,href:`/practice/part-${part}`});
    if (candidates.length >= 2) break;
  }
  const allowedParts = input.mode === "reading" ? [5,6,7] : input.mode === "listening" ? [1,2,3,4] : [5,2,6,3,7,1,4];
  for (const part of [...allowedParts].sort((a,b)=>(input.partAttempts[a]??0)-(input.partAttempts[b]??0))) {
    if (candidates.length >= 2) break;
    if (!candidates.some((item)=>item.part===part)) candidates.push({kind:"practice",part,title:`Part ${part} 基礎練習`,detail:"近期練習較少 · 5 題",count:5,href:`/practice/part-${part}`});
  }
  if (input.dueVocabulary > 0) candidates.push({kind:"vocabulary",title:"單字複習",detail:`${Math.min(10,input.dueVocabulary)} 個待複習`,count:Math.min(10,input.dueVocabulary),href:"/vocabulary?tab=review"});
  if (input.unresolvedWrong > 0) candidates.push({kind:"wrong",title:"錯題補強",detail:`從 ${input.unresolvedWrong} 題未熟悉錯題開始`,count:Math.min(5,input.unresolvedWrong),href:"/wrong-answers?filter=unfamiliar"});
  return candidates.slice(0,4);
}
function inferPart(skill:string){const match=skill.match(/^part_?(\d)_/);if(match)return Number(match[1]);return 5;}
function allowed(part:number,mode:PracticeMode){return mode==="all"||mode==="reading"&&part>=5||mode==="listening"&&part<=4;}
