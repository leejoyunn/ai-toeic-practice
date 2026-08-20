export interface SectionPerformance{correct:number;total:number;averageDifficulty?:number}
export interface ScoreEstimate{low:number;high:number;label:string}
export interface MockScoreEstimate{listening:ScoreEstimate;reading:ScoreEstimate;total:ScoreEstimate;confidence:"Low"|"Medium"|"High";disclaimer:string}
function sectionEstimate(section:SectionPerformance,full:boolean):ScoreEstimate{
  if(!section.total)return{low:0,high:0,label:"未測驗"};
  const ratio=section.correct/section.total,difficulty=Math.max(-.05,Math.min(.05,(section.averageDifficulty??1)-1)*.05);
  const adjusted=Math.max(0,Math.min(1,ratio+difficulty));
  const center=5+adjusted*490,margin=full?20:section.total>=50?30:section.total>=20?45:65;
  const round=(value:number)=>Math.max(5,Math.min(495,Math.round(value/5)*5));
  const low=round(center-margin),high=round(center+margin);return{low,high,label:`約 ${low}～${high}`};
}
export function estimateMockScore(input:{listening:SectionPerformance;reading:SectionPerformance;kind:"mini"|"full";questionCount:number}):MockScoreEstimate{
  const full=input.kind==="full",listening=sectionEstimate(input.listening,full),reading=sectionEstimate(input.reading,full);
  const total={low:listening.low+reading.low,high:listening.high+reading.high,label:`約 ${listening.low+reading.low}～${listening.high+reading.high}`};
  const confidence:MockScoreEstimate["confidence"]=full?"High":input.questionCount>=100?"High":input.questionCount>=50?"Medium":"Low";
  return{listening,reading,total,confidence,disclaimer:"此分數為 TOEIC Path 根據本次練習表現估算，不代表 ETS 官方 TOEIC 成績。"};
}
