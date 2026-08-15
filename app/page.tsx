import Link from "next/link";
import { BookOpen, Brain, ChevronRight, Flame, Headphones, Target, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/supabase/auth";

const tasks = [
  { label: "Part 5 基礎文法", detail: "詞性判斷 · 10 題", tone: "mint", icon: BookOpen },
  { label: "Part 2 應答練習", detail: "Wh-question · 10 題", tone: "blue", icon: Headphones },
  { label: "今日單字", detail: "高頻商務字彙 · 10 個", tone: "amber", icon: Brain },
];

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <AppShell user={user} active="home">
      <main className="page-content">
        <header className="welcome-row">
          <div>
            <p className="eyebrow">SATURDAY · TODAY</p>
            <h1>{user ? `嗨，${user.name ?? "學習者"}` : "準備好進步了嗎？"}</h1>
            <p className="muted">每天一點點，從 400 穩穩走向 550。</p>
          </div>
          {!user && <Link href="/login" className="button button-small">登入同步</Link>}
        </header>

        <section className="hero-card">
          <div className="hero-copy">
            <span className="pill"><Target size={15}/> 400 → 550 基礎補強</span>
            <h2>今天，先把基礎打穩。</h2>
            <p>根據你的學習階段，建議從基礎文法與應答開始。完成後再練 10 個高頻單字。</p>
            <Link className="button button-light" href="/practice/recommended">開始今日練習 <ChevronRight size={18}/></Link>
          </div>
          <div className="score-orbit" aria-label="目前程度約 400 分，目標 550 分">
            <div className="orbit-ring"><strong>400</strong><span>目前程度</span></div>
            <div className="goal-chip">目標 550</div>
          </div>
        </section>

        <section className="stats-grid" aria-label="今日學習摘要">
          <article className="stat-card"><span className="stat-icon coral"><Flame size={20}/></span><div><strong>7 天</strong><span>連續學習</span></div></article>
          <article className="stat-card"><span className="stat-icon green"><Trophy size={20}/></span><div><strong>12 題</strong><span>今日完成</span></div></article>
          <article className="stat-card"><span className="stat-icon blue"><Target size={20}/></span><div><strong>75%</strong><span>本週正確率</span></div></article>
        </section>

        <section className="section-block">
          <div className="section-heading"><div><p className="eyebrow">YOUR PLAN</p><h2>今日建議</h2></div><span>約 25 分鐘</span></div>
          <div className="task-list">
            {tasks.map(({ label, detail, icon: Icon, tone }) => (
              <Link href="/practice/recommended" className="task-card" key={label}>
                <span className={`task-icon ${tone}`}><Icon size={21}/></span><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={19}/>
              </Link>
            ))}
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading"><div><p className="eyebrow">QUICK START</p><h2>選擇練習方式</h2></div></div>
          <div className="practice-grid">
            <Link href="/practice/listening" className="practice-card listening"><Headphones/><span><strong>聽力練習</strong><small>Part 1–4 · 需要聲音</small></span><ChevronRight/></Link>
            <Link href="/practice/reading" className="practice-card reading"><BookOpen/><span><strong>閱讀練習</strong><small>Part 5–7 · 安靜也能做</small></span><ChevronRight/></Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
