import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound(){return <main className="route-state"><SearchX/><p className="eyebrow">404 NOT FOUND</p><h1>找不到這個頁面</h1><p>網址可能已失效，或這筆學習資料不屬於目前登入帳號。</p><Link className="button" href="/">返回首頁</Link></main>;}
