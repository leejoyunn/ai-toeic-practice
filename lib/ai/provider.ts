import type { GeneratedQuestion } from "@/lib/ai/schema";
import type { Difficulty, ReadingPart } from "@/types/toeic";
import type { GeneratedListeningQuestion } from "@/lib/ai/listening-schema";
import type { RotationPlan } from "@/lib/toeic/rotation/rotation-service";

export interface GenerateQuestionsInput {
  part: ReadingPart;
  count: number;
  targetScore: number;
  currentEstimatedLevel: number;
  difficulty: Difficulty;
  weakSkills: string[];
  recentScenarios: string[];
  recentVocabularyDomains: string[];
  recentSentencePatterns: string[];
  passageMode?: "single" | "double" | "triple";
  rotation?: RotationPlan;
}

export interface AiProvider {
  readonly name: string;
  generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]>;
  generateListeningQuestions(input: GenerateListeningQuestionsInput): Promise<GeneratedListeningQuestion[]>;
}

export interface GenerateListeningQuestionsInput{part:1|2|3|4;count:number;targetScore:number;currentEstimatedLevel:number;difficulty:Difficulty;weakSkills:string[];recentScenarios:string[];images?:Array<NonNullable<GeneratedListeningQuestion["image"]>>;rotation?:RotationPlan}

export class AiProviderUnavailableError extends Error {
  constructor(message = "目前無法產生新題目，請稍後再試。") {
    super(message);
    this.name = "AiProviderUnavailableError";
  }
}

export function getAiProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
  if (provider === "gemini") {
    // Kept dynamic so adding another provider never bundles its server code into the client.
    return new GeminiProviderProxy();
  }
  throw new AiProviderUnavailableError(`尚未支援 AI Provider：${provider}`);
}

class GeminiProviderProxy implements AiProvider {
  readonly name = "gemini";
  async generateQuestions(input: GenerateQuestionsInput) {
    const { GeminiProvider } = await import("./providers/gemini");
    return new GeminiProvider().generateQuestions(input);
  }
  async generateListeningQuestions(input: GenerateListeningQuestionsInput){const {generateGeminiListeningQuestions}=await import("./providers/gemini-listening");return generateGeminiListeningQuestions(input);}
}
