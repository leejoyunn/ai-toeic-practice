import Link from "next/link";
import { LogIn } from "lucide-react";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/auth";
import { GoogleSignInButton } from "./sign-in-button";
export default async function LoginPage(){const configured=hasSupabaseEnv();const user=await getCurrentUser();return <main className="auth-page"><section className="auth-card"><Link href="/" className="brand"><span className="brand-mark">T</span>TOEIC PATH</Link><LogIn size={34}/><h1>{user?"你已登入":"登入並同步進度"}</h1><p>{user?`${user.email} 的學習紀錄會安全同步。`:"使用 Google 帳號登入，在手機、平板與電腦延續你的學習進度。"}</p>{user?<Link className="button google-button" href="/profile">查看個人資料</Link>:<GoogleSignInButton disabled={!configured}/>} {!configured&&<div className="notice">尚未設定 Supabase 環境變數。首頁仍可使用；完成 README 的設定後即可登入。</div>}<p style={{marginTop:22}}><Link className="text-link" href="/">返回首頁</Link></p></section></main>}
