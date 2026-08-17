import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/supabase/auth";
import { ReadingPractice } from "@/features/reading/reading-practice";
import { ListeningPractice } from "@/features/listening/listening-practice";
import type { ReadingPart } from "@/types/toeic";

export default async function Page({params,searchParams}:{params:Promise<{mode:string}>;searchParams:Promise<{difficulty?:string;passageMode?:string}>}){const [{mode},query,user]=await Promise.all([params,searchParams,getCurrentUser()]);const match=/^part-([1-7])$/.exec(mode);if(!match)notFound();const part=Number(match[1]);if(part<=4)return <AppShell user={user} active="practice"><ListeningPractice part={part as 1|2|3|4} signedIn={Boolean(user)}/></AppShell>;const readingPart=part as ReadingPart;const initialDifficulty=query.difficulty==="easy"||query.difficulty==="medium"||query.difficulty==="hard"?query.difficulty:"auto";const initialPassageMode=query.passageMode==="single"||query.passageMode==="double"||query.passageMode==="triple"?query.passageMode:undefined;return <AppShell user={user} active="practice"><ReadingPractice part={readingPart} signedIn={Boolean(user)} initialDifficulty={initialDifficulty} initialPassageMode={initialPassageMode}/></AppShell>}
