import Link from "next/link";
import { BarChart3, BookMarked, CircleUserRound, Home, Layers3 } from "lucide-react";
import type { AuthUser } from "@/types/user";

const nav = [
  { key:"home", label:"首頁", href:"/", icon:Home },
  { key:"practice", label:"練習", href:"/practice", icon:Layers3 },
  { key:"mistakes", label:"錯題", href:"/wrong-answers", icon:BookMarked },
  { key:"stats", label:"統計", href:"/stats", icon:BarChart3 },
  { key:"profile", label:"我的", href:"/profile", icon:CircleUserRound },
] as const;

export function AppShell({ children, active, user }: { children:React.ReactNode; active:typeof nav[number]["key"]; user:AuthUser|null }) {
  const items = nav.map(({ key,label,href,icon:Icon }) => <Link key={key} href={href} className={`nav-link ${active===key?"active":""}`}><Icon size={20}/><span>{label}</span></Link>);
  return <div className="app-shell">
    <aside className="sidebar"><Link href="/" className="brand"><span className="brand-mark">T</span>TOEIC PATH</Link><nav className="nav-list">{items}</nav><Link className="sidebar-profile" href={user?"/profile":"/login"}><span className="avatar">{user?.name?.[0]??"你"}</span><span><strong>{user?.name??"尚未登入"}</strong><span>{user?"跨裝置同步中":"登入以同步進度"}</span></span></Link></aside>
    <div className="shell-main">{children}</div><nav className="mobile-nav" aria-label="主要導覽">{items}</nav>
  </div>;
}
