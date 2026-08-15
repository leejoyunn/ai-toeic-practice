import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/supabase/auth";
import { ReadingPractice } from "@/features/reading/reading-practice";
import type { ReadingPart } from "@/types/toeic";

export default async function Page({params}:{params:Promise<{mode:string}>}){const [{mode},user]=await Promise.all([params,getCurrentUser()]);const match=/^part-([567])$/.exec(mode);if(!match)notFound();const part=Number(match[1]) as ReadingPart;return <AppShell user={user} active="practice"><ReadingPractice part={part} signedIn={Boolean(user)}/></AppShell>}
