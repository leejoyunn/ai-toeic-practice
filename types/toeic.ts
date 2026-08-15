export type ToeicPart = 1|2|3|4|5|6|7;
export type Difficulty = "easy"|"medium"|"hard";
export type MasteryLevel = "learning"|"improving"|"familiar"|"mastered";
export interface QuestionOption { id:"A"|"B"|"C"|"D"; text:string; }
export interface VocabularyEntry { word:string; chineseMeaning:string; partOfSpeech:string; simpleExample?:string; exampleTranslation?:string; commonCollocations?:string[]; }
export interface ToeicQuestion { id:string; userId:string; part:ToeicPart; questionType:string; question:string; options:QuestionOption[]; correctAnswer:QuestionOption["id"]; explanation:string; translation:string; vocabulary:VocabularyEntry[]; grammarPoint:string|null; difficulty:Difficulty; targetScore:number; topic:string; scenario:string; keywords:string[]; vocabularyDomain:string|null; sentencePattern:string|null; questionHash:string; createdAt:string; }
export interface ListeningQuestion extends ToeicQuestion { part:1|2|3|4; transcript:string; speakers:string[]; imageId?:string; }
export interface ReadingQuestion extends ToeicQuestion { part:5|6|7; passage?:string; passageType?:string; }
export interface Attempt { id:string; userId:string; questionId:string; selectedAnswer:string; correctAnswer:string; isCorrect:boolean; part:ToeicPart; grammarPoint:string|null; topic:string|null; difficulty:Difficulty; answeredAt:string; }
export interface PracticeSession { id:string; userId:string; mode:"self_selected"|"recommended"; status:"generating"|"active"|"completed"|"abandoned"; part:ToeicPart|null; requestedCount:number; completedCount:number; startedAt:string; completedAt:string|null; }
export interface UserStats { totalQuestions:number; correctRate:number; streakDays:number; partAccuracy:Partial<Record<ToeicPart,number>>; }
export interface MockTest { id:string; userId:string; kind:"mini"|"full"; status:"active"|"submitted"; questionCount:number; startedAt:string; submittedAt:string|null; }
