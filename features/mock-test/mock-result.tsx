/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";
import type { MockQuestion,MockTestRow } from "@/lib/toeic/mock-test/types";
import type { MockScoreEstimate } from "@/lib/toeic/mock-test/score-estimator";

export function MockResult({data}:{data:{test:MockTestRow;questions:MockQuestion[]}}) {
  const [review,setReview]=useState(false);
  const score=(data.test.generation_metadata.score??null)as MockScoreEstimate|null;
  const partStats=(data.test.generation_metadata.partStats??{})as Record<string,{attempts:number;correct:number}>;
  const listeningTotal=data.questions.filter(q=>q.part<=4).length,readingTotal=data.questions.length-listeningTotal;
  return <><header className="practice-header"><p className="eyebrow">RESULT</p><h1>模擬考結果</h1><p>{data.test.total_correct} / {data.test.question_count} 題正確 · {Math.round(data.test.total_correct/data.test.question_count*100)}%</p></header><div className="result-score-grid"><Score title="Listening" correct={data.test.listening_correct} total={listeningTotal} estimate={score?.listening.label}/><Score title="Reading" correct={data.test.reading_correct} total={readingTotal} estimate={score?.reading.label}/><Score title="Estimated Total" correct={data.test.total_correct} total={data.test.question_count} estimate={score?.total.label}/></div><section className="analytics-card"><h2>Part breakdown</h2><div className="part-result-grid">{Object.entries(partStats).map(([part,stat])=><div key={part}><b>Part {part}</b><span>{stat.correct}/{stat.attempts}</span><small>{Math.round(stat.correct/stat.attempts*100)}%</small></div>)}</div></section><section className="analytics-card score-disclaimer"><b>Confidence：{score?.confidence??"—"}</b><p>{score?.disclaimer??"此分數為 TOEIC Path 根據本次練習表現估算，不代表 ETS 官方 TOEIC 成績。"}</p></section><button className="button" onClick={()=>setReview(value=>!value)}>{review?"收合詳解":"查看詳解"}</button>{review&&<div className="mock-review-list">{data.questions.map(question=><ReviewCard question={question} key={question.id}/>)}</div>}</>;
}

function ReviewCard({question}:{question:MockQuestion}){
  const metadata=question.generation_metadata??{},image=(metadata.image??null)as{imageUrl?:unknown;description?:unknown}|null;
  const documents=Array.isArray(metadata.documents)?metadata.documents as Array<{id?:unknown;label?:unknown;content?:unknown}>:[];
  return <article className={question.is_correct?"correct":"incorrect"}><div><span>第 {question.position} 題 · Part {question.part}</span><b>{question.is_correct?"正確":"錯誤"}</b></div>{question.part===1&&typeof image?.imageUrl==="string"&&<img className="mock-photo" src={image.imageUrl} alt={typeof image.description==="string"?image.description:"Part 1 題目照片"}/>} {documents.length>1?<div className="mock-documents">{documents.map((document,index)=>typeof document.content==="string"?<section key={typeof document.id==="string"?document.id:index}><b>{typeof document.label==="string"?document.label:`Document ${index+1}`}</b><p>{document.content}</p></section>:null)}</div>:question.part>=6&&question.passage&&<div className="mock-passage">{question.passage}</div>}<h2>{question.question}</h2><p>你的答案：{question.selected_answer??"未作答"} / 正確答案：{question.correct_answer}</p><p><b>中文解析：</b>{question.explanation}</p>{question.translation&&<p><b>中文翻譯：</b>{question.translation}</p>}{question.part<=4&&question.transcript&&<p><b>Transcript：</b>{question.transcript}</p>}{question.vocabulary?.length?<p><b>Vocabulary：</b>{question.vocabulary.map(word=>`${word.word}（${word.chineseMeaning}）`).join("、")}</p>:null}<small>考點：{question.grammar_point}</small></article>;
}
function Score({title,correct,total,estimate}:{title:string;correct:number;total:number;estimate?:string}){return <article><span>{title}</span><strong>{total?`${correct}/${total}`:"—"}</strong><small>{estimate??"未估算"}</small></article>;}
