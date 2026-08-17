import { z } from "zod";
import { vocabularySchema } from "@/lib/ai/schema";

export const listeningOptionSchema=z.object({id:z.enum(["A","B","C","D"]),text:z.string().min(1).max(500)});
export const dialogueTurnSchema=z.object({speaker:z.string().min(1).max(20),text:z.string().min(2).max(1000)});
export const listeningSpeakerSchema=z.object({id:z.string().min(1).max(20),name:z.string().min(1).max(80),voiceRole:z.enum(["primary","secondary","tertiary"])});
export const listeningImageSchema=z.object({id:z.string().min(1),imageUrl:z.string().min(1),description:z.string().min(10),tags:z.array(z.string()),scene:z.string().min(1),objects:z.array(z.string()),actions:z.array(z.string()),isActive:z.boolean(),sourceName:z.string().min(1),sourceUrl:z.string().url(),license:z.string().min(1)});

export const generatedListeningQuestionSchema=z.object({
  part:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]),questionType:z.string().min(1).max(80),question:z.string().min(3).max(500),
  options:z.array(listeningOptionSchema).min(3).max(4),correctAnswer:z.enum(["A","B","C","D"]),explanation:z.string().min(15).max(3000),translation:z.string().min(5).max(4000),
  vocabulary:z.array(vocabularySchema).min(1).max(8),skill:z.string().min(1).max(100),difficulty:z.enum(["easy","medium","hard"]),targetScore:z.number().int().min(300).max(990),
  topic:z.string().min(1).max(100),scenario:z.string().min(1).max(100),vocabularyDomain:z.string().min(1).max(100),sentencePattern:z.string().min(1).max(160),keywords:z.array(z.string().min(1).max(60)).min(2).max(10),
  transcript:z.string().min(5).max(6000),speakers:z.array(listeningSpeakerSchema).max(3),dialogue:z.array(dialogueTurnSchema).max(30),audioGroupId:z.string().min(1).max(80).nullable(),audioType:z.string().min(1).max(80),image:listeningImageSchema.nullable(),
}).superRefine((question,context)=>{
  if(new Set(question.options.map((option)=>option.id)).size!==question.options.length)context.addIssue({code:"custom",message:"Listening 選項 ID 不可重複。",path:["options"]});
  if(new Set(question.options.map((option)=>option.text.trim().toLowerCase())).size!==question.options.length)context.addIssue({code:"custom",message:"Listening 選項內容不可重複。",path:["options"]});
  if(!question.options.some((option)=>option.id===question.correctAnswer))context.addIssue({code:"custom",message:"正確答案不存在於選項中。",path:["correctAnswer"]});
  if(!/[\u3400-\u9fff]/u.test(question.explanation)||!/[\u3400-\u9fff]/u.test(question.translation))context.addIssue({code:"custom",message:"解析與翻譯必須包含繁體中文。",path:["translation"]});
  if(question.part===2&&question.options.length!==3)context.addIssue({code:"custom",message:"Part 2 必須正好有三個回答選項。",path:["options"]});
  if(question.part!==2&&question.options.length!==4)context.addIssue({code:"custom",message:"Part 1、3、4 必須正好有四個選項。",path:["options"]});
  if(question.part===3&&(question.speakers.length<2||question.dialogue.length<4))context.addIssue({code:"custom",message:"Part 3 必須包含至少兩位講者與完整對話 turns。",path:["dialogue"]});
  if(question.part===4&&(question.speakers.length!==1||question.dialogue.length))context.addIssue({code:"custom",message:"Part 4 必須是單一講者的短獨白。",path:["speakers"]});
  if(question.part===1&&!question.image)context.addIssue({code:"custom",message:"Part 1 必須使用圖片 metadata。",path:["image"]});
});

export const generatedListeningBatchSchema=z.object({questions:z.array(generatedListeningQuestionSchema).min(1).max(10)}).superRefine(({questions},context)=>{
  const part=questions[0]?.part;if(!part||questions.some((question)=>question.part!==part))return;
  if((part===3||part===4)&&questions.length>=2){const first=questions[0];if(!first.audioGroupId||questions.some((question)=>question.audioGroupId!==first.audioGroupId||question.transcript!==first.transcript||JSON.stringify(question.dialogue)!==JSON.stringify(first.dialogue)))context.addIssue({code:"custom",message:`Part ${part} 同組多題必須共用完全相同的音檔內容。`,path:["questions"]});}
  if(part===1&&new Set(questions.map((question)=>question.image?.id)).size!==questions.length)context.addIssue({code:"custom",message:"Part 1 同一批題目的 imageId 不可重複。",path:["questions"]});
});
export type GeneratedListeningQuestion=z.infer<typeof generatedListeningQuestionSchema>;

export const listeningGenerationRequestSchema=z.object({part:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]),count:z.number().int().min(1).max(10),difficulty:z.enum(["easy","medium","hard"]).optional(),imageId:z.string().optional()});
