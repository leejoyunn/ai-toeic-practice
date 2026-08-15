# TOEIC Path — AI 多益英文練習系統

為 TOEIC 約 400 分、第一階段目標 550 分的學習者設計。Phase 1 已完成 Mobile First 首頁、導覽、Supabase／Google OAuth 與 PWA 基礎；Phase 2 已完成 AI 即時生成 Reading Part 5–7、作答與白話詳解。

## 技術架構

- Next.js 相容的 Vinext、React 19、TypeScript、Tailwind CSS 4
- Supabase Auth + PostgreSQL + Row Level Security
- PWA manifest；後續以瀏覽器 Web Speech API 實作免費 TTS
- 可替換的 `AiProvider` 介面；API Key 僅供未來 Server route 使用

## 本機安裝與啟動

```bash
npm install
copy .env.example .env.local
npm run dev
```

打開開發伺服器顯示的 Local URL。正式檢查使用 `npm run build`。

## 環境變數

`.env.local` 需要：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
AI_PROVIDER=
AI_API_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=
```

`NEXT_PUBLIC_*` 僅能放 Supabase 公開 URL 與 anon key；不得放 service role key。Phase 2 建議設定 `AI_PROVIDER=gemini`、`GEMINI_API_KEY`，模型可用 `GEMINI_MODEL=gemini-2.5-flash-lite`。`AI_API_KEY` 是其他 Provider 的通用保留欄位。所有 AI Key 只允許 Server 讀取。

## Gemini 免費 Provider

1. 登入 [Google AI Studio](https://aistudio.google.com/)。
2. 到 API Keys 頁建立新的 Gemini API Key；新帳號可使用具有限額的 Free Tier。
3. 將 Key 填入本機 `.env.local` 的 `GEMINI_API_KEY`，不要加上 `NEXT_PUBLIC_`。
4. 設定 `AI_PROVIDER=gemini` 與 `GEMINI_MODEL=gemini-2.5-flash-lite`。
5. 免費額度與可用模型可能調整，請以 AI Studio 的 Usage／Rate limits 為準。

## Supabase 設定

1. 建立 Supabase project。
2. 在 SQL Editor 執行 `supabase/migrations/202608150001_initial_schema.sql`。
3. 到 Project Settings → API，將 Project URL 與 anon/public key 寫進 `.env.local`。
4. 到 Authentication → URL Configuration：Site URL 設成本機或正式網址；Redirect URLs 加入 `http://localhost:3000/auth/callback`（若開發伺服器使用不同 port，請同步修改）。
5. SQL 已啟用 RLS；使用者資料表只允許目前登入者讀寫。共用圖片與單字只允許登入者讀取。

## Google OAuth 設定

1. 到 Google Cloud Console 建立 OAuth 2.0 Client（Web application）。
2. Google 的 Authorized redirect URI 請填 Supabase Dashboard → Authentication → Providers → Google 顯示的 callback URL，格式通常為 `https://<project-ref>.supabase.co/auth/v1/callback`。
3. 將 Google Client ID 與 Client Secret 填入 Supabase 的 Google Provider 設定並啟用。
4. 確認 Supabase Redirect URLs 包含網站的 `/auth/callback`。
5. 重新啟動本機伺服器，至 `/login` 測試登入。

## Phase 1 測試清單

- `/`：首頁與 Listening／Reading 分流，調整到 375、390、430、768px 檢查沒有橫向捲動。
- 手機寬度：底部導覽可點；桌面寬度：左側導覽可點。
- `/login`：未設環境變數時顯示友善提示；完成設定後可用 Google 登入。
- `/profile`：登入後顯示帳號與學習階段，另一裝置登入同帳號可辨識同一 `user_id`。
- `/practice`：選擇 Reading Part 5、6、7。
- `/practice/part-5`：生成句子填空並逐題作答。
- `/practice/part-6`：確認每題包含完整短文與上下文題。
- `/practice/part-7`：確認每題包含原創文章與閱讀理解題。
- 作答後確認一定顯示正確答案、中文解析、單字、考點與完整翻譯。
- 瀏覽器 Application 面板：可讀取 PWA manifest，display 為 standalone。

## 後續階段

- Phase 2（已完成）：Reading Part 5–7、AI 生成 API、Zod 驗證、作答詳解、基礎防重複與 400→550 難度策略。
- Phase 3：Listening Part 1–4、Web Speech API、多 voice 與逐字稿。
- Phase 4：question hash、相似度、最近 500 題冷卻、情境與考點輪替。
- Phase 5–7：錯題與 mastery、統計推薦及單字、Mini／Full Mock Test。
- Phase 8：完整 UI／PWA 圖示與離線策略、錯誤處理、正式部署。

防重複所需的 `question_hash`、`grammar_point`、`scenario`、`vocabulary_domain`、`sentence_pattern` 及索引已在 Phase 1 schema 預留。正式資料以 Supabase 為準，瀏覽器儲存只會用於 UI 偏好與未送出暫存。
