"use client";

import Link from "next/link";
import { CircleAlert,RotateCcw } from "lucide-react";

export default function GlobalError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="route-state" role="alert"><CircleAlert/><h1>這個頁面暫時無法載入</h1><p>你的資料不會因此消失。請檢查網路後再試一次，或返回首頁。</p><div><button className="button" onClick={reset}><RotateCcw/>再試一次</button><Link className="button secondary-button" href="/">返回首頁</Link></div></main>;}
