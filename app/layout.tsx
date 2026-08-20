import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { NetworkStatus } from "@/components/system/network-status";

const sans = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"] });
const zh = Noto_Sans_TC({ variable: "--font-zh", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "TOEIC Path｜多益練習", template: "%s｜TOEIC Path" },
  description: "為 400 到 550 分設計的漸進式 TOEIC Listening & Reading 練習系統。",
  manifest: "/manifest.webmanifest",
  applicationName: "TOEIC PATH",
  appleWebApp: { capable:true,statusBarStyle:"default",title:"TOEIC PATH" },
  icons: { icon:[{url:"/icon.svg",type:"image/svg+xml"},{url:"/icon-192.png",sizes:"192x192",type:"image/png"}],apple:"/apple-touch-icon.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#173f3a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body className={`${sans.variable} ${zh.variable}`}><NetworkStatus/>{children}</body></html>;
}
