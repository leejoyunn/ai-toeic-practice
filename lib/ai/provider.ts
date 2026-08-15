import type { ToeicQuestion } from "@/types/toeic";

export interface GenerateQuestionsInput { userId:string; part:1|2|3|4|5|6|7; count:number; targetScore:number; currentEstimatedLevel:number; difficulty:"easy"|"medium"|"hard"; weakSkills:string[]; recentScenarios:string[]; }
export interface AiProvider { readonly name:string; generateQuestions(input:GenerateQuestionsInput):Promise<ToeicQuestion[]>; }
export class AiProviderUnavailableError extends Error { constructor(){ super("目前無法產生新題目，請稍後再試。"); this.name="AiProviderUnavailableError"; } }
// TODO Phase 2: implement a free-tier provider on the server, validate with Zod,
// retry malformed output, and persist accepted batches before returning them.
