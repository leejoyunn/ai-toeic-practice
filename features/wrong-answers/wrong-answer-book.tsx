"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Headphones, LoaderCircle, Pause, Play, RotateCcw, SkipBack, Sparkles } from "lucide-react";
import { useTts } from "@/features/listening/use-tts";
import { TtsVolumeControl } from "@/features/listening/tts-volume-control";
import { buildPart2TtsSegments } from "@/lib/tts/toeic-sequences";
import type { Difficulty, QuestionOption, VocabularyEntry } from "@/types/toeic";
import { userMessage } from "@/lib/errors/user-message";

interface StoredQuestion {
  id: string; part: number; question: string; question_type: string; options: QuestionOption[];
  correct_answer: string; explanation: string; translation: string; vocabulary: VocabularyEntry[];
  grammar_point: string | null; difficulty: Difficulty; passage: string | null;
  passage_type: string | null; transcript: string | null; generation_metadata: Record<string, unknown>;
}
export interface WrongAnswerItem {
  question_id: string; wrong_count: number; retry_count: number; resolved: boolean;
  last_wrong_at: string; selectedAnswer: string; answeredAt: string; question: StoredQuestion;
}
type Filter = "all" | "recent" | "unfamiliar" | "familiar" | `part-${number}`;

export function WrongAnswerBook({ initialItems, initialError, referenceNow }: { initialItems: WrongAnswerItem[]; initialError: string; referenceNow:string }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState(initialError);
  const [recentCutoff] = useState(() => new Date(referenceNow).getTime() - 7 * 86_400_000);
  const shown = useMemo(() => items.filter((item) =>
    filter === "all" ||
    (filter === "recent" && new Date(item.last_wrong_at).getTime() >= recentCutoff) ||
    (filter === "unfamiliar" && !item.resolved) ||
    (filter === "familiar" && item.resolved) ||
    (filter.startsWith("part-") && item.question.part === Number(filter.slice(5))),
  ), [items, filter, recentCutoff]);

  async function mark(item: WrongAnswerItem) {
    setError("");
    const response = await fetch(`/api/wrong-answers/${item.question_id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolved: !item.resolved }),
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setError(userMessage(payload.error,"無法更新錯題狀態。")); return; }
    setItems((all) => all.map((entry) => entry.question_id === item.question_id ? { ...entry, resolved: !entry.resolved } : entry));
  }

  const filters = ["all", "recent", "unfamiliar", "familiar", ...Array.from({ length: 7 }, (_, i) => `part-${i + 1}`)] as Filter[];
  return <><div className="wrong-filters">{filters.map((value) => <button className={filter === value ? "selected" : ""} key={value} onClick={() => setFilter(value)}>{filterLabel(value)}</button>)}</div>
    {error && <div className="practice-error">{error}</div>}<div className="wrong-list">
      {shown.map((item) => <article className="wrong-card" key={item.question_id}>
        <header><div><span className="status-chip-inline">Part {item.question.part}</span><span className={`mastery-chip ${item.resolved ? "resolved" : ""}`}>{item.resolved ? "已熟悉" : "尚未熟悉"}</span></div><button className="icon-button" aria-label="展開錯題" onClick={() => setOpen(open === item.question_id ? null : item.question_id)}><ChevronDown /></button></header>
        <h2>{item.question.question}</h2><div className="wrong-meta"><span>當時選擇 {item.selectedAnswer}</span><span>錯誤 {item.wrong_count} 次</span><span>{item.question.grammar_point ?? item.question.question_type}</span><span>{difficultyLabel(item.question.difficulty)}</span><span>{new Date(item.answeredAt).toLocaleDateString("zh-TW")}</span></div>
        {open === item.question_id && <WrongDetail item={item} onMark={() => mark(item)} onError={setError} />}
      </article>)}
      {!shown.length && <div className="empty-wrong"><Check /><h2>目前沒有符合篩選的錯題</h2><p>繼續練習，錯題會在這裡集中複習。</p></div>}
    </div></>;
}

function WrongDetail({ item, onMark, onError }: { item: WrongAnswerItem; onMark: () => void; onError: (message: string) => void }) {
  const [retry, setRetry] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean; correctAnswer: string; explanation: string; translation: string; vocabulary: VocabularyEntry[]; grammarPoint: string; transcript?: string | null; mastery?: { masteryLevel: string; recentAccuracy: number; consecutiveCorrect: number; consecutiveWrong: number } } | null>(null);
  const [loading, setLoading] = useState(false);
  const tts = useTts();
  const q = item.question;
  const metadata = q.generation_metadata ?? {};
  const image = isRecord(metadata.image) ? metadata.image : null;
  const documents = Array.isArray(metadata.documents) ? metadata.documents.filter(isRecord) : [];

  async function answer(id: string) {
    if (selected) return;
    setSelected(id);
    const response = await fetch("/api/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: q.id, selectedAnswer: id }) });
    const payload: unknown = await response.json();
    if (!response.ok) { setSelected(null); onError(isRecord(payload) && typeof payload.error === "string" ? payload.error : "無法儲存作答。"); return; }
    setResult(payload as typeof result);
  }
  async function remediate() {
    setLoading(true);
    const response = await fetch("/api/remediation/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ originQuestionId: q.id }) });
    const payload = await response.json() as { url?: string; error?: string };
    setLoading(false);
    if (!response.ok || !payload.url) { onError(userMessage(payload.error,"無法生成同考點新題。")); return; }
    window.location.assign(payload.url);
  }
  function playAudio() {
    const segments = q.part === 2
      ? buildPart2TtsSegments(q.transcript ?? q.question, q.options)
      : [{ text: q.transcript ?? q.question, speaker: "Narrator" }];
    tts.play(segments);
  }

  return <div className="wrong-detail">
    {q.part === 1 && image && typeof image.imageUrl === "string" && <Image className="listening-photo" src={image.imageUrl} alt={typeof image.description === "string" ? image.description : "原錯題圖片"} width={900} height={600} />}
    {documents.map((doc, index) => <div className="passage" key={index}><span>{typeof doc.label === "string" ? doc.label : `Document ${index + 1}`}</span><p>{String(doc.content ?? "")}</p></div>)}
    {q.passage && <div className="passage"><span>{q.passage_type}</span><p>{q.passage}</p></div>}
    {!retry && <dl className="wrong-summary"><div><dt>正確答案</dt><dd>{q.correct_answer}</dd></div><div><dt>中文解析</dt><dd>{q.explanation}</dd></div><div><dt>完整翻譯</dt><dd>{q.translation}</dd></div>
      {q.vocabulary.length > 0 && <div><dt>單字解釋</dt><dd>{q.vocabulary.map((word) => <p key={`${word.word}-${word.partOfSpeech}`}><b>{word.word}</b> ({word.partOfSpeech})：{word.chineseMeaning} <AddVocabularyButton word={word}/></p>)}</dd></div>}
      {q.transcript && <div><dt>Transcript</dt><dd>{q.transcript}</dd></div>}</dl>}
    {retry && <div className="retry-panel"><h3>{q.part <= 4 ? "請先聽音訊後作答（Transcript 會在作答後顯示）" : q.question}</h3>
      {q.part <= 4 && <div className="audio-controls" aria-live="polite"><button className="button button-small" onClick={playAudio} disabled={!tts.supported}><Headphones />{tts.status === "playing" ? "播放中…" : "播放題目"}</button><button type="button" onClick={tts.status === "paused" ? tts.resume : tts.pause} disabled={tts.status === "idle"} aria-label={tts.status === "paused" ? "繼續播放" : "暫停"}>{tts.status === "paused" ? <Play /> : <Pause />}</button><button type="button" onClick={playAudio} disabled={!tts.supported} aria-label="重新播放"><SkipBack /></button><TtsVolumeControl volume={tts.volume} onChange={tts.setVolume}/></div>}{tts.error && <div className="practice-error">{tts.error}</div>}
      <div className="options-list">{q.options.map((option) => <button className={`option-card ${result?.correctAnswer === option.id ? "correct" : ""} ${selected === option.id && result && !result.isCorrect ? "wrong" : ""}`} disabled={Boolean(selected)} onClick={() => answer(option.id)} key={option.id}><span>{option.id}</span><strong>{q.part <= 4 && !result ? `選項 ${option.id}` : option.text}</strong></button>)}</div>
      {result && <div className="retry-result"><strong>{result.isCorrect ? "答對了！" : "再看一次就會了"}</strong><p><b>你的答案：</b>{selected} · <b>正確答案：</b>{result.correctAnswer}</p>{result.transcript && <p><b>Question transcript：</b>{result.transcript}</p>}<p><b>中文解析：</b>{result.explanation}</p><p><b>完整翻譯：</b>{result.translation}</p>{result.vocabulary.length > 0 && <div><b>單字：</b>{result.vocabulary.map((word) => <p key={`${word.word}-${word.partOfSpeech}`}>{word.word} ({word.partOfSpeech})：{word.chineseMeaning}</p>)}</div>}<p><b>Skill：</b>{result.grammarPoint}</p>{result.mastery && <p><b>目前考點狀態：</b>{masteryText(result.mastery.masteryLevel)}（近期正確率 {Math.round(result.mastery.recentAccuracy)}%）</p>}</div>}
    </div>}
    <div className="wrong-actions"><button className="button button-small" onClick={() => setRetry(true)}><RotateCcw />重新作答</button><button className="button button-small secondary-button" onClick={remediate} disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <Sparkles />}AI 生成同考點新題</button><button className="button button-small secondary-button" onClick={onMark}><Check />{item.resolved ? "取消已熟悉" : "標示已熟悉"}</button></div>
  </div>;
}

function difficultyLabel(value:Difficulty){return value==="easy"?"簡單":value==="medium"?"中等":"困難"}
function filterLabel(value: Filter) { return value === "all" ? "全部" : value === "recent" ? "最近錯題" : value === "unfamiliar" ? "尚未熟悉" : value === "familiar" ? "已熟悉" : `Part ${value.slice(5)}`; }
function masteryText(value: string) { return value === "mastered" ? "已掌握" : value === "familiar" ? "熟悉" : value === "improving" ? "進步中" : "學習中"; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function AddVocabularyButton({word}:{word:VocabularyEntry}){const[state,setState]=useState<"idle"|"loading"|"done"|"error">("idle"),[error,setError]=useState("");async function add(){setState("loading");setError("");const response=await fetch("/api/vocabulary/items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...word,source:"wrong_answer"})});const payload=await response.json()as{error?:string};setState(response.ok?"done":"error");if(!response.ok)setError(payload.error??"無法加入單字庫。")}return <span><button className="inline-add-button" disabled={state==="loading"||state==="done"} onClick={add}>{state==="done"?"已加入":state==="loading"?"加入中…":state==="error"?"重試":"加入單字庫"}</button>{error&&<small className="inline-error">{error}</small>}</span>}
