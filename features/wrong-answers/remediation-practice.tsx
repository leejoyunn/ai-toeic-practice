"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Headphones, Pause, Play, SkipBack, Sparkles, X } from "lucide-react";
import { useTts } from "@/features/listening/use-tts";
import { TtsVolumeControl } from "@/features/listening/tts-volume-control";
import { buildPart2TtsSegments } from "@/lib/tts/toeic-sequences";
import type { QuestionOption, VocabularyEntry } from "@/types/toeic";

export interface RemediationQuestion {
  id: string; part: number; question: string; options: QuestionOption[]; difficulty: string;
  scenario: string; passage: string | null; passage_type: string | null; transcript: string | null;
  generation_metadata: Record<string, unknown>;
}
interface Result {
  isCorrect: boolean; correctAnswer: string; explanation: string; translation: string;
  vocabulary: VocabularyEntry[]; grammarPoint: string; transcript?: string | null;
  mastery?: { masteryLevel: string; recentAccuracy: number };
}

export function RemediationPractice({ sessionId, questions }: { sessionId: string; questions: RemediationQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const current = questions[index];
  const tts = useTts();
  const cancelTts = tts.cancel;
  useEffect(() => cancelTts, [cancelTts, index]);

  async function answer(id: string) {
    if (selected || !current) return;
    setSelected(id);
    const response = await fetch("/api/attempts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: current.id, selectedAnswer: id, sessionId }),
    });
    const payload = await response.json() as Result & { error?: string };
    if (!response.ok) { setSelected(null); setError(payload.error ?? "無法儲存作答。"); return; }
    setResult(payload);
  }
  function next() { setIndex((value) => value + 1); setSelected(null); setResult(null); setError(""); }
  function play() {
    if (!current) return;
    const segments = current.part === 2
      ? buildPart2TtsSegments(current.transcript ?? current.question, current.options)
      : [{ text: current.transcript ?? current.question, speaker: "Narrator" }];
    tts.play(segments);
  }

  if (!current) return <main className="reading-page"><section className="finish-card"><Check /><h1>補強練習完成</h1><Link href="/wrong-answers" className="button">回到錯題本</Link></section></main>;
  const metadata = current.generation_metadata ?? {};
  const documents = Array.isArray(metadata.documents) ? metadata.documents.filter(isRecord) : [];
  const image = isRecord(metadata.image) ? metadata.image : null;

  return <main className="reading-page">
    <header className="reading-topbar"><Link href="/wrong-answers"><ArrowLeft /></Link><div><span>REMEDIATION · PART {current.part}</span><strong>同考點全新題目</strong></div><small>{index + 1} / {questions.length}</small></header>
    <section className="question-layout"><div className="question-card">
      <div className="mini-strategy"><Sparkles />考點相同，但句子、情境、單字與選項都已更換。</div>
      {current.part === 1 && image && typeof image.imageUrl === "string" && <Image className="listening-photo" src={image.imageUrl} alt="Part 1 remediation" width={900} height={600} />}
      {documents.map((doc, i) => <article className="passage" key={i}><span>{String(doc.label ?? `Document ${i + 1}`)}</span><p>{String(doc.content ?? "")}</p></article>)}
      {current.passage && <article className="passage"><span>{current.passage_type}</span><p>{current.passage}</p></article>}
      {current.part <= 4 && <div className="audio-controls" aria-live="polite"><button className="button button-small" onClick={play} disabled={!tts.supported}><Headphones />{tts.status === "playing" ? "播放中…" : "播放題目"}</button><button type="button" onClick={tts.status === "paused" ? tts.resume : tts.pause} disabled={tts.status === "idle"} aria-label={tts.status === "paused" ? "繼續播放" : "暫停"}>{tts.status === "paused" ? <Play /> : <Pause />}</button><button type="button" onClick={play} disabled={!tts.supported} aria-label="重新播放"><SkipBack /></button><TtsVolumeControl volume={tts.volume} onChange={tts.setVolume}/><span>作答後才會顯示 transcript。</span></div>}
      {tts.error && <div className="practice-error">{tts.error}</div>}
      <h1>{current.part <= 2 ? "請聽音訊並選出最佳答案。" : current.question}</h1>
      <div className="options-list">{current.options.map((option) => {
        const correct = result?.correctAnswer === option.id;
        const wrong = selected === option.id && result && !result.isCorrect;
        return <button className={`option-card ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}`} disabled={Boolean(selected)} onClick={() => answer(option.id)} key={option.id}><span>{option.id}</span><strong>{current.part <= 4 && !result ? `選項 ${option.id}` : option.text}</strong>{correct && <Check />}{wrong && <X />}</button>;
      })}</div>{error && <div className="practice-error">{error}</div>}
    </div>
      {result && <aside className={`explanation-card ${result.isCorrect ? "success" : "failure"}`}><h2>{result.isCorrect ? "答對了！" : "再練一次就會了"}</h2><p><b>你的答案：</b>{selected} · <b>正確答案：</b>{result.correctAnswer}</p>
        {result.transcript && <section className="answer-detail"><h2>Transcript</h2><p>{result.transcript}</p></section>}
        <section className="answer-detail"><h2>中文解析</h2><p>{result.explanation}</p></section>
        <section className="answer-detail"><h2>考點</h2><p>{result.grammarPoint}</p></section>
        <section className="answer-detail"><h2>完整翻譯</h2><p>{result.translation}</p></section>
        {result.vocabulary.length > 0 && <section className="answer-detail"><h2>單字</h2>{result.vocabulary.map((word) => <p key={`${word.word}-${word.partOfSpeech}`}><b>{word.word}</b>：{word.chineseMeaning}</p>)}</section>}
        {result.mastery && <section className="answer-detail"><h2>目前考點狀態</h2><p>{masteryText(result.mastery.masteryLevel)}（近期正確率 {Math.round(result.mastery.recentAccuracy)}%）</p></section>}
        <button className="button generate-button" onClick={next}>{index + 1 === questions.length ? "完成補強" : "下一題"}<ChevronRight /></button>
      </aside>}
    </section>
  </main>;
}

function masteryText(value: string) { return value === "mastered" ? "已掌握" : value === "familiar" ? "熟悉" : value === "improving" ? "進步中" : "學習中"; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
