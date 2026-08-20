"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, ChevronRight, CircleAlert, LoaderCircle, RotateCcw, Sparkles, X } from "lucide-react";
import type { Difficulty, QuestionOption, ReadingPart, VocabularyEntry } from "@/types/toeic";
import { userMessage } from "@/lib/errors/user-message";

interface PassageDocument { id:string;label:string;type:string;content:string; }
interface PublicQuestion { id:string;part:number;questionType:string;question:string;options:QuestionOption[];difficulty:Difficulty;targetScore:number;topic:string;scenario:string;grammarPoint:string;passage:string|null;passageType:string|null;passageGroupId:string|null;blankNumber:number|null;documents:PassageDocument[]; }
interface AnswerResult { isCorrect:boolean;correctAnswer:QuestionOption["id"];explanation:string;translation:string;vocabulary:VocabularyEntry[];grammarPoint:string; }
type Stage="setup"|"loading"|"quiz"|"finished";
const partCopy:Record<ReadingPart,{title:string;subtitle:string}>={5:{title:"Incomplete Sentences",subtitle:"句子填空 · 基礎文法與高頻字彙"},6:{title:"Text Completion",subtitle:"段落填空 · 文法與上下文"},7:{title:"Reading Comprehension",subtitle:"閱讀理解 · 資訊定位與同義改寫"}};

export function ReadingPractice({part,signedIn,initialDifficulty="auto",initialPassageMode}:{part:ReadingPart;signedIn:boolean;initialDifficulty?:"auto"|Difficulty;initialPassageMode?:"single"|"double"|"triple"}){
  const [stage,setStage]=useState<Stage>("setup");const [count,setCount]=useState(5);const [difficulty,setDifficulty]=useState<"auto"|Difficulty>(initialDifficulty);
  const [questions,setQuestions]=useState<PublicQuestion[]>([]);const [index,setIndex]=useState(0);const [selected,setSelected]=useState<QuestionOption["id"]|null>(null);
  const [result,setResult]=useState<AnswerResult|null>(null);const [error,setError]=useState("");const [strategy,setStrategy]=useState("");const [correctCount,setCorrectCount]=useState(0);
  const current=questions[index]; const copy=partCopy[part];

  async function generate(){if(!signedIn){setError("請先使用 Google 登入，題目才能安全儲存並跨裝置同步。");return;}setStage("loading");setError("");try{const response=await fetch("/api/practice/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({part,count,...(difficulty==="auto"?{}:{difficulty}),...(part===7&&initialPassageMode?{passageMode:initialPassageMode}:{})})});const payload=await response.json() as {questions?:PublicQuestion[];error?:string;strategy?:{reason:string}};if(!response.ok||!payload.questions?.length)throw new Error(userMessage(payload.error,"目前無法產生新題目。"));setQuestions(payload.questions);setStrategy(payload.strategy?.reason??"");setIndex(0);setSelected(null);setResult(null);setCorrectCount(0);setStage("quiz");}catch(cause){setError(cause instanceof Error?cause.message:"目前無法產生新題目，請稍後再試。");setStage("setup");}}
  async function answer(option:QuestionOption["id"]){if(selected||!current)return;setSelected(option);setError("");try{const response=await fetch("/api/attempts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({questionId:current.id,selectedAnswer:option})});const payload=await response.json() as AnswerResult&{error?:string};if(!response.ok)throw new Error(userMessage(payload.error,"無法儲存答案。"));setResult(payload);if(payload.isCorrect)setCorrectCount((value)=>value+1);}catch(cause){setSelected(null);setError(cause instanceof Error?cause.message:"無法儲存答案，請再試一次。");}}
  function next(){if(index+1>=questions.length){setStage("finished");return;}setIndex((value)=>value+1);setSelected(null);setResult(null);setError("");}
  function reset(){setStage("setup");setQuestions([]);setIndex(0);setSelected(null);setResult(null);setError("");}

  return <main className="reading-page"><header className="reading-topbar"><Link href="/practice" aria-label="返回練習選擇"><ArrowLeft/></Link><div><span>READING · PART {part}</span><strong>{copy.title}</strong></div>{stage==="quiz"&&<small>{index+1} / {questions.length}</small>}</header>
    {stage==="setup"&&<section className="setup-card"><span className="setup-icon"><BookOpen/></span><p className="eyebrow">PART {part}</p><h1>{copy.title}</h1><p className="muted">{copy.subtitle}</p><div className="setup-fields"><fieldset><legend>題數</legend><div className="segmented">{[5,10].map((value)=><button className={count===value?"selected":""} onClick={()=>setCount(value)} key={value}>{value} 題</button>)}</div></fieldset><fieldset><legend>難度</legend><div className="segmented four">{(["auto","easy","medium","hard"] as const).map((value)=><button className={difficulty===value?"selected":""} onClick={()=>setDifficulty(value)} key={value}>{value==="auto"?"系統推薦":value==="easy"?"簡單":value==="medium"?"中等":"困難"}</button>)}</div></fieldset></div><div className="strategy-note"><Sparkles/><span><strong>循序漸進，不直接跳級</strong><small>系統會同時參考目前程度、目標分數與最近表現。</small></span></div>{error&&<ErrorMessage message={error}/>}<button className="button generate-button" onClick={generate}>AI 生成原創題目 <ChevronRight/></button><small className="form-note">一次只生成 5–10 題並存入 Supabase，避免浪費免費額度。</small></section>}
    {stage==="loading"&&<section className="loading-card" aria-live="polite"><LoaderCircle className="spin"/><h1>正在準備你的 Part {part} 練習…</h1><p>AI 正在出題並檢查格式、答案與重複內容，通常需要幾秒鐘。</p><div className="skeleton-lines"><i/><i/><i/><i/></div></section>}
    {stage==="quiz"&&current&&<section className="question-layout"><div className="question-card"><div className="question-meta"><span>Part {part}</span><span>{difficultyLabel(current.difficulty)}</span><span>{current.scenario}</span></div>{strategy&&index===0&&<div className="mini-strategy"><Sparkles size={16}/>{strategy}</div>}<PassageContent question={current}/>{getDisplayPrompt(current,index)&&<h1>{getDisplayPrompt(current,index)}</h1>}<div className="options-list">{current.options.map((option)=>{const correct=result?.correctAnswer===option.id;const wrong=selected===option.id&&result&&!result.isCorrect;return <button key={option.id} disabled={Boolean(selected)} onClick={()=>answer(option.id)} className={`option-card ${correct?"correct":""} ${wrong?"wrong":""}`}><span>{option.id}</span><strong>{option.text}</strong>{correct&&<Check/>}{wrong&&<X/>}</button>})}</div>{error&&<ErrorMessage message={error}/>}</div>{result&&<aside className={`explanation-card ${result.isCorrect?"success":"failure"}`} aria-live="polite"><div className="result-title">{result.isCorrect?<Check/>:<X/>}<span><strong>{result.isCorrect?"答對了！":"再看一次就會了"}</strong><small>正確答案是 {result.correctAnswer}</small></span></div><Detail title="中文解析"><p>{result.explanation}</p></Detail><Detail title="文法／考點"><p>{result.grammarPoint}</p></Detail><Detail title="重要單字"><div className="vocab-list">{result.vocabulary.map((word)=><div key={`${word.word}-${word.partOfSpeech}`}><strong>{word.word}</strong><span>{word.partOfSpeech} · {word.chineseMeaning}</span>{word.simpleExample&&<small>{word.simpleExample}<br/>{word.exampleTranslation}</small>}</div>)}</div></Detail><Detail title="完整中文翻譯"><p>{result.translation}</p></Detail><button className="button generate-button" onClick={next}>{index+1===questions.length?"查看結果":"下一題"}<ChevronRight/></button></aside>}</section>}
    {stage==="finished"&&<section className="finish-card"><span className="finish-icon"><Check/></span><p className="eyebrow">PRACTICE COMPLETE</p><h1>完成 Part {part} 練習！</h1><strong className="result-score">{correctCount} / {questions.length}</strong><p>本次正確率 {Math.round(correctCount/questions.length*100)}%。答錯的題目已加入錯題紀錄，後續會產生相同考點但內容全新的變化題。</p><div className="finish-actions"><button className="button" onClick={reset}><RotateCcw/>再練一組</button><Link className="button secondary-button" href="/practice">選擇其他 Part</Link></div></section>}
  </main>;
}

function difficultyLabel(value:Difficulty){return value==="easy"?"簡單":value==="medium"?"中等":"困難"}
function ErrorMessage({message}:{message:string}){return <div className="practice-error"><CircleAlert/>{message}</div>}
function Detail({title,children}:{title:string;children:React.ReactNode}){return <section className="answer-detail"><h2>{title}</h2>{children}</section>}

function PassageContent({question}:{question:PublicQuestion}) {
  if (question.part===7&&question.documents.length) return <div>{question.documents.map((document)=><article className="passage" key={document.id}><span>{document.label} · {document.type}</span><p>{document.content}</p></article>)}</div>;
  return question.passage?<article className="passage"><span>{question.passageType}</span><p>{question.passage}</p></article>:null;
}

function getDisplayPrompt(question: PublicQuestion, index: number) {
  if (question.part !== 6) return question.question;
  const prompt = question.question.trim();
  const normalizedPassage = normalizeForComparison(question.passage ?? "");
  const normalizedPrompt = normalizeForComparison(prompt);
  const repeatsPassage = normalizedPassage.length >= 30 && normalizedPrompt.includes(normalizedPassage);
  const embedsOptions = /\[[A-D]\]/iu.test(prompt);
  if (repeatsPassage || embedsOptions || prompt.length > 200) {
    const blankNumber = question.passage?.match(/\((\d+)\)\s*_{2,}/u)?.[1] ?? String(index + 1);
    return `Choose the best answer for blank (${blankNumber}).`;
  }
  return prompt;
}

function normalizeForComparison(value: string) {
  return value.toLowerCase().replace(/\s+/gu, "").replace(/[^a-z0-9\u3400-\u9fff_()]/gu, "");
}
