export interface SimilarityRecord{
  part:number;question:string;options:Array<{text:string}>;passage?:string|null;passageType?:string|null;documents?:Array<{content:string}>;
  transcript?:string|null;grammarPoint?:string|null;sentencePattern?:string|null;scenario?:string|null;groupId?:string|null;
  image?:{id:string;scene:string;actions:string[]}|null;
}

export function normalizeText(value:string){return value.toLowerCase().normalize("NFKC").replace(/[’']/gu,"").replace(/[^a-z0-9\s]/gu," ").replace(/\s+/gu," ").trim();}
const join=(values:Array<string|null|undefined>)=>normalizeText(values.filter(Boolean).join(" "));

export function buildPartFingerprint(record:SimilarityRecord){
  const options=record.options.map((option)=>option.text).join(" ");
  switch(record.part){
    case 1:return join([record.image?.id,record.image?.scene,record.image?.actions.join(" "),options]);
    case 2:return join([record.transcript,options,record.grammarPoint]);
    case 3:return join([record.transcript,record.question,options,record.scenario]);
    case 4:return join([record.transcript,record.question,options,record.scenario]);
    case 5:return join([record.question,options,record.grammarPoint,record.sentencePattern]);
    case 6:return join([record.passage,record.question,options]);
    case 7:return join([record.documents?.map((document)=>document.content).join(" ")??record.passage,record.question,options,record.passageType]);
    default:return join([record.passage,record.transcript,record.question,options]);
  }
}

/** The content users actually hear/read first, kept separate so options cannot
 * dilute a repeated stem or listening script. */
export function buildPrimaryFingerprint(record:SimilarityRecord){
  switch(record.part){
    case 1:return join([record.image?.id]);
    case 2:return join([record.transcript]);
    case 3:
    case 4:return join([record.transcript]);
    case 5:return join([record.question]);
    case 6:return join([record.passage,record.question]);
    case 7:return join([record.documents?.map((document)=>document.content).join(" ")??record.passage,record.question]);
    default:return join([record.passage,record.transcript,record.question]);
  }
}

export function buildExactFingerprint(record:SimilarityRecord){return join([record.question,record.passage,record.documents?.map((document)=>document.content).join(" "),record.options.map((option)=>option.text).join(" "),record.transcript]);}
export async function createQuestionHash(record:SimilarityRecord){const bytes=new TextEncoder().encode(buildExactFingerprint(record));const digest=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest),(byte)=>byte.toString(16).padStart(2,"0")).join("");}
