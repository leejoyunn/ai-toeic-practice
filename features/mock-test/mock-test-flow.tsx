/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback,useEffect,useMemo,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import { Pause,Play,RotateCcw,Volume2 } from "lucide-react";
import type { MockQuestion,MockTestRow } from "@/lib/toeic/mock-test/types";
import { generationBatches,type PartDistribution } from "@/lib/toeic/mock-test/distribution";
import { ALLOW_LISTENING_REPLAY,FULL_READING_SECONDS } from "@/lib/toeic/mock-test/config";
import { formatTime } from "@/lib/toeic/mock-test/timer";
import { useTts } from "@/features/listening/use-tts";
import { TtsVolumeControl } from "@/features/listening/tts-volume-control";
import type { TtsSegment } from "@/lib/tts/provider";

type MockInitial={test:MockTestRow;questions:MockQuestion[];timerSnapshotSeconds:number};

export function MockTestFlow({initial}:{initial:MockInitial}) {
  return initial.test.status==="generating"?<MockPreparation initial={initial}/>:<MockRunner initial={initial}/>;
}

function MockPreparation({initial}:{initial:MockInitial}) {
  const router=useRouter();
  const initialCounts=useMemo(()=>counts(initial.questions),[initial.questions]);
  const [progress,setProgress]=useState(initialCounts),[error,setError]=useState(""),[working,setWorking]=useState(false);
  const workingRef=useRef(false),progressRef=useRef(initialCounts);
  const distribution=useMemo(()=>(initial.test.generation_metadata.distribution??{})as PartDistribution,[initial.test.generation_metadata]);
  const prepare=useCallback(async()=>{
    if(workingRef.current)return;
    workingRef.current=true;setWorking(true);setError("");
    try{
      for(const part of [1,2,3,4,5,6,7]as const){
        const remaining=(distribution[part]??0)-(progressRef.current[part]??0);
        for(const count of generationBatches(remaining)){
          const endpoint=part<=4?"/api/listening/generate":"/api/practice/generate";
          const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({part,count})});
          const payload=await response.json()as{error?:string;questions?:Array<{id:string}>};
          if(!response.ok||!payload.questions)throw new Error(friendlyPreparationError(part,payload.error));
          const attach=await fetch(`/api/mock-test/${initial.test.id}/batch`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({part,questionIds:payload.questions.map(q=>q.id)})});
          const attached=await attach.json()as{error?:string;complete?:boolean};
          if(!attach.ok)throw new Error(attached.error??"保存準備進度失敗。");
          progressRef.current={...progressRef.current,[part]:(progressRef.current[part]??0)+count};setProgress(progressRef.current);
          if(attached.complete){router.refresh();return;}
        }
      }
    }catch(cause){setError(cause instanceof Error?cause.message:"模擬考尚未準備完成，可稍後繼續準備。");}
    finally{workingRef.current=false;setWorking(false);}
  },[distribution,initial.test.id,router]);
  useEffect(()=>{void prepare();},[prepare]);
  const listening=sumParts(progress,[1,2,3,4]),reading=sumParts(progress,[5,6,7]),listeningTotal=sumParts(distribution,[1,2,3,4]),readingTotal=sumParts(distribution,[5,6,7]);
  return <main className="page-content mock-preparing"><p className="eyebrow">PREPARING</p><h1>正在準備模擬考…</h1><p>已完成的批次會保留；重新整理後只補尚未完成的題目。</p><Progress label="Listening" value={listening} total={listeningTotal}/><Progress label="Reading" value={reading} total={readingTotal}/>{error&&<><div className="practice-error">{error}</div><button className="button" onClick={prepare} disabled={working}>{working?"重試中…":"繼續準備"}</button></>}<Abandon id={initial.test.id}/></main>;
}

function Progress({label,value,total}:{label:string;value:number;total:number}){if(!total)return null;return <div className="mock-progress"><span><b>{label}</b><strong>{value} / {total}</strong></span><progress value={value} max={total}/></div>;}
function counts(questions:MockQuestion[]){return questions.reduce<Record<number,number>>((all,q)=>({...all,[q.part]:(all[q.part]??0)+1}),{});}
function sumParts(values:Record<number,number>,parts:number[]){return parts.reduce((sum,part)=>sum+(values[part]??0),0);}
function friendlyPreparationError(part:number,message?:string){if(message?.includes("AI 回傳格式未通過驗證"))return`Part ${part} 題目經多輪品質檢查仍未通過。已完成的題目都已保留，請按「繼續準備」只補剩餘題目。`;return message??`Part ${part} 題目生成失敗。`;}

function MockRunner({initial}:{initial:MockInitial}) {
  const router=useRouter(),questions=initial.questions,firstReading=Math.max(0,questions.findIndex(q=>q.part>=5));
  const initialSection=initial.test.kind==="full"?initial.test.current_section:questions[initial.test.current_question-1]?.part<=4?"listening":"reading";
  const [section,setSection]=useState<"listening"|"reading">(initialSection),[index,setIndex]=useState(Math.min(initial.test.current_question-1,questions.length-1));
  const [answers,setAnswers]=useState<Record<string,string>>(()=>Object.fromEntries(questions.filter(q=>q.selected_answer).map(q=>[q.id,q.selected_answer!])));
  const [seconds,setSeconds]=useState(initial.timerSnapshotSeconds);
  const [message,setMessage]=useState(""),[confirm,setConfirm]=useState(false),[sectionPrompt,setSectionPrompt]=useState(false),[submitting,setSubmitting]=useState(false);
  const question=questions[index],tts=useTts(),cancelTts=tts.cancel;
  const submit=useCallback(async()=>{setSubmitting(true);setMessage("");const response=await fetch(`/api/mock-test/${initial.test.id}/submit`,{method:"POST"}),payload=await response.json()as{error?:string};if(!response.ok){setMessage(payload.error??"交卷失敗，答案已保留。");setSubmitting(false);return;}router.push(`/mock-test/${initial.test.id}/result`);},[initial.test.id,router]);
  const enterReading=useCallback(async()=>{setSectionPrompt(false);setSection("reading");setIndex(firstReading);setSeconds(FULL_READING_SECONDS);await fetch(`/api/mock-test/${initial.test.id}/state`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentQuestion:firstReading+1,currentSection:"reading",remainingSeconds:FULL_READING_SECONDS,resetTimer:true})});},[firstReading,initial.test.id]);
  useEffect(()=>{const timer=setInterval(()=>setSeconds(current=>{if(current<=1){clearInterval(timer);if(initial.test.kind==="full"&&section==="listening")setSectionPrompt(true);else void submit();return 0;}return current-1;}),1000);return()=>clearInterval(timer);},[initial.test.kind,section,submit]);
  useEffect(()=>{const persist=setInterval(()=>void fetch(`/api/mock-test/${initial.test.id}/state`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentQuestion:index+1,remainingSeconds:seconds})}),15000);return()=>clearInterval(persist);},[index,seconds,initial.test.id]);
  useEffect(()=>{void fetch(`/api/mock-test/${initial.test.id}/state`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentQuestion:index+1})});},[index,initial.test.id]);
  useEffect(()=>{cancelTts();},[index,cancelTts]);
  async function choose(answer:string){setAnswers(all=>({...all,[question.id]:answer}));const response=await fetch(`/api/mock-test/${initial.test.id}/answer`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({questionId:question.id,selectedAnswer:answer,position:question.position})});if(!response.ok){const payload=await response.json()as{error?:string};setMessage(payload.error??"答案同步失敗，請再選一次。");}else setMessage("");}
  const unanswered=questions.length-Object.keys(answers).length;
  function requestSubmit(){if(unanswered)setConfirm(true);else void submit();}
  const listening=question.part<=4,hideOptionText=question.part<=2,metadata=question.generation_metadata??{},image=(metadata.image??null)as{imageUrl?:string}|null;
  function play(){tts.play(ttsSegments(question,metadata));}
  const visibleQuestions=initial.test.kind==="full"?questions.filter(q=>section==="listening"?q.part<=4:q.part>=5):questions;
  function next(){if(index===questions.length-1)return;if(initial.test.kind==="full"&&section==="listening"&&questions[index+1]?.part>=5){setSectionPrompt(true);return;}setIndex(value=>value+1);}
  return <main className="mock-test-layout"><section className="mock-topbar"><div><span>{initial.test.kind==="full"?"Full Mock":"Mini Mock"}</span><b>{section==="listening"?"Listening":"Reading"} · Part {question.part}</b></div><time aria-label={`剩餘時間 ${formatTime(seconds)}`}>{formatTime(seconds)}</time><button onClick={requestSubmit} disabled={submitting}>交卷</button></section><div className="mock-workspace"><aside className="question-navigator" aria-label="題號導覽"><h2>題號</h2><div>{visibleQuestions.map(q=>{const i=questions.indexOf(q);return <button aria-label={`第 ${i+1} 題，${answers[q.id]?"已作答":"未作答"}`} className={`${i===index?"current":""} ${answers[q.id]?"answered":""}`} onClick={()=>setIndex(i)} key={q.id}>{i+1}</button>;})}</div><p>未作答：{unanswered}</p></aside><article className="mock-question"><div className="question-meta"><span>第 {index+1} / {questions.length} 題</span><span>Part {question.part}</span></div>{image?.imageUrl&&<img className="mock-photo" src={image.imageUrl} alt="Part 1 題目照片"/>}{listening&&<div className="mock-audio"><button onClick={tts.status==="playing"?tts.pause:tts.status==="paused"?tts.resume:play}>{tts.status==="playing"?<Pause/>:<Play/>}{tts.status==="playing"?"暫停":tts.status==="paused"?"繼續":"播放題目"}</button>{ALLOW_LISTENING_REPLAY&&<button onClick={play}><RotateCcw/>重新播放</button>}<TtsVolumeControl volume={tts.volume} onChange={tts.setVolume}/><small><Volume2/>正式 TOEIC 不提供重播，本系統第一版仍允許重播作為練習輔助。</small>{tts.error&&<div className="practice-error">{tts.error}</div>}</div>}{question.part>=6&&question.passage&&<div className="mock-passage">{question.passage}</div>}<h1>{question.question}</h1><div className="mock-answer-options">{question.options.map(option=><button className={answers[question.id]===option.id?"selected":""} key={option.id} onClick={()=>choose(option.id)}><span>{option.id}</span>{!hideOptionText&&<strong>{option.text}</strong>}</button>)}</div>{message&&<div className="practice-error">{message}</div>}<footer><button disabled={index===0||(initial.test.kind==="full"&&section==="reading"&&index===firstReading)} onClick={()=>setIndex(i=>i-1)}>上一題</button><button disabled={index===questions.length-1} onClick={next}>{initial.test.kind==="full"&&section==="listening"&&questions[index+1]?.part>=5?"完成 Listening":"下一題"}</button></footer></article></div>{sectionPrompt&&<div className="mock-modal" role="dialog" aria-modal="true"><div><h2>Listening 已完成</h2><p>即將進入 Reading，Reading 練習模擬時限為 75 分鐘。</p><button className="button" onClick={enterReading}>進入 Reading</button></div></div>}{confirm&&<div className="mock-modal" role="dialog" aria-modal="true" aria-labelledby="submit-title"><div><h2 id="submit-title">你還有 {unanswered} 題未作答，確定要交卷嗎？</h2><button onClick={()=>setConfirm(false)}>返回作答</button><button className="button" onClick={submit}>確認交卷</button></div></div>}<Abandon id={initial.test.id}/></main>;
}

function ttsSegments(question:MockQuestion,metadata:Record<string,unknown>):TtsSegment[]{
  if(question.part===1)return question.options.map(option=>({text:`${option.id}. ${option.text}`,speaker:"narrator",pauseAfterMs:350}));
  if(question.part===2)return[{text:question.transcript??question.question,speaker:"narrator",pauseAfterMs:450},...question.options.map(option=>({text:`${option.id}. ${option.text}`,speaker:"narrator",pauseAfterMs:350}))];
  const dialogue=Array.isArray(metadata.dialogue)?metadata.dialogue as Array<{speaker?:unknown;text?:unknown}>:[];
  if(question.part===3&&dialogue.length)return dialogue.flatMap(turn=>typeof turn.text==="string"?[{text:turn.text,speaker:typeof turn.speaker==="string"?turn.speaker:"speaker",pauseAfterMs:180}]:[]);
  return[{text:question.transcript??"",speaker:"narrator"}];
}

function Abandon({id}:{id:string}){const router=useRouter(),[confirm,setConfirm]=useState(false);async function abandon(){const response=await fetch(`/api/mock-test/${id}/abandon`,{method:"POST"});if(response.ok)router.push("/mock-test");}return <div className="abandon-zone">{confirm?<><span>確定放棄？這份測驗不會計入學習成績。</span><button onClick={()=>setConfirm(false)}>取消</button><button onClick={abandon}>確認放棄</button></>:<button onClick={()=>setConfirm(true)}>放棄測驗</button>}</div>;}
