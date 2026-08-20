# TOEIC PATH

TOEIC PATH 是為英文程度約 TOEIC 400 分、第一階段目標 550 分的學習者設計的個人學習系統。介面以繁體中文提供白話解析，題目維持英文，並依作答、錯題、熟練度與單字狀態循序調整。目前 Phase 1–8 已完成，是可進行正式部署驗證的第一版。

## 核心功能

- Listening Part 1–4：照片描述、應答、對話與獨白；Web Speech API、多講者 voice mapping、暫停／繼續／重播與共用音量偏好。
- Reading Part 5–7：句子填空、篇章填空、Single／Double／Triple Passage。
- AI 原創題目：server-side Gemini `AiProvider` abstraction，不以固定題庫作為最終來源。
- 400 → 550：Easy、Medium、Hard 循序調整。
- Phase 4 防重複：最近 500 題、`question_hash`、fingerprint、Jaccard、bigram、trigram、Levenshtein、recency weighting、情境／考點輪替與 regenerate。
- Wrong Answer Book、原題重做、同考點新題、mastery tracking。
- Statistics、弱項分析與 Recommended Practice。
- Vocabulary 去重、熟悉度、spaced review 與 `next_review_at`。
- Mini Mock 20／50／100（Mixed、Reading-only、Listening-only）與 Full Mock 200 分批準備；timer persistence、未作答提醒、abandon、Result、Answer Review、History。
- PWA manifest、正式 icon、standalone 顯示與基本離線提示。

## Tech Stack 與 Architecture

- Vinext `1.0.0-beta.2`（Next.js App Router 相容 API）、React 19、TypeScript、Vite 8、Tailwind CSS 4
- Supabase Auth、PostgreSQL、Row Level Security
- Gemini API、Zod、Web Speech API

主要目錄：`app/`（頁面與 routes）、`features/`（功能 UI）、`lib/ai/`（AI provider/schema）、`lib/similarity/`（防重複）、`lib/toeic/`（學習 domain）、`lib/supabase/`（SSR/auth client）、`supabase/migrations/`（資料庫）、`public/listening/`（Part 1 素材）。

## Environment Variables

複製 `.env.example` 為 `.env.local`：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
AI_PROVIDER=gemini
AI_API_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
```

`NEXT_PUBLIC_*` 只允許 Supabase 公開 URL 與 anon key；安全性由 RLS 控制。Gemini key、service role、OAuth Client Secret 與 token 禁止加上 `NEXT_PUBLIC_`，也不得提交 Git。`AI_API_KEY` 是 provider abstraction 的相容 fallback，Gemini 建議使用 `GEMINI_API_KEY`。

沒有 Gemini key 時，首頁、登入、Profile、Statistics、Vocabulary 與 History 仍可使用；AI generation 會顯示友善設定提示，不會讓整站啟動失敗。

## Local Setup

需求：Node.js 22.13 或更新版本。

```bash
npm install
copy .env.example .env.local
npm run dev
```

開啟 `http://localhost:3000`。Production checks：

```bash
npm run build
npx tsc --noEmit
npm run lint
git diff --check
```

## Supabase Migration

建立 Supabase project 後，依檔名順序在 SQL Editor 執行，不可只跑最後一支：

1. `202608150001_initial_schema.sql`
2. `202608162220_fix_authenticated_table_grants.sql`
3. `202608180001_phase6_vocabulary_item_rpc.sql`
4. `202608180002_phase7_mock_tests.sql`
5. `202608180003_phase7_submit_processing_stage.sql`

`202608150000_cleanup_partial_schema.sql` 只供舊版 initial migration 曾中途失敗的 project 使用；新 project 不需執行。Migration 會建立必要 GRANT、RLS、ownership constraint 與 index。一般 App 不使用 service role 繞過 RLS。

## Google OAuth Setup

1. Google Cloud Console 建立 Web OAuth Client。
2. Google Authorized redirect URI 設為 Supabase Provider 顯示的 `https://<project-ref>.supabase.co/auth/v1/callback`。
3. Client ID／Secret 只填入 Supabase Dashboard。
4. 本機 Supabase Site URL 設為 `http://localhost:3000`。
5. Redirect allow list 加入 `http://localhost:3000/auth/callback`；production 也加入對應 HTTPS callback。
6. App callback 會以 PKCE `exchangeCodeForSession` 寫入 HTTP session cookie。

## AI Provider

到 [Google AI Studio](https://aistudio.google.com/) 建立 key，設定 `AI_PROVIDER=gemini`、`GEMINI_API_KEY` 與可替換的 `GEMINI_MODEL`。模型與免費額度可能變動，請以 Google 官方資訊為準。AI 輸出會經 Zod、品質與 Phase 4 similarity validation；quota、timeout 或多輪驗證失敗時可安全重試。

## PWA / Offline

- Manifest：`/manifest.webmanifest`
- Display：`standalone`
- Icons：SVG、192×192、512×512、Apple touch icon
- Android／Chrome：使用瀏覽器「安裝應用程式」；iOS：Safari → 分享 →「加入主畫面」。

目前沒有 service worker。這是 production-safety 選擇：OAuth callback、authenticated API、AI responses、Supabase data 與 Mock submit 不應被錯誤快取。離線時會顯示提示，但不宣稱支援完整 offline learning。

## Deployment

專案實際使用 Vinext，不是標準 Next.js CLI。建議選擇 Vinext／Cloudflare runtime 相容平台，先在 staging 設定 env、執行 production build，並驗證 RSC、route handlers、cookies、Supabase HTTPS、PWA assets 與 OAuth callback。Repository 不宣稱可零設定部署 Vercel，也不會自動建立付費資源；選定平台後依當時 Vinext 官方 adapter 文件設定。

## Security Notes

- AI key 只由 server code 讀取；browser bundle 只含 Supabase URL／anon key。
- Route Handlers 使用 `auth.getUser()`，使用者資料由 RLS 與 `user_id` 隔離。
- production 不輸出 OAuth code、token、cookie value、key 或非必要診斷。
- `.env*`、build/cache、logs、OS/editor temp 已忽略，`.env.example` 明確保留。
- 不快取 OAuth、authenticated API、AI response 或 Mock submission。

## Limitations / Content Note

TTS 音質與最大音量依瀏覽器／作業系統；Gemini free tier 有 quota 與模型可用性限制；Estimated Score 不代表 ETS 官方成績；Full Mock 是練習 shell；第一版只有基本離線提示。

Part 1 圖片位於 `public/listening/`，來源與 license metadata 位於 `lib/listening/images.ts`，依 [Unsplash License](https://unsplash.com/license) 與 [Pexels License](https://www.pexels.com/license/) 使用。

TOEIC 是 Educational Testing Service（ETS）的註冊商標。TOEIC PATH 是獨立個人學習系統，與 ETS 無官方隸屬或背書關係。題目為 AI 原創 TOEIC-style practice，不複製 ETS 官方題庫。
