export const ALLOW_LISTENING_REPLAY = true;
export const FULL_LISTENING_SECONDS = 45 * 60;
export const FULL_READING_SECONDS = 75 * 60;
export const MINI_TIME_SECONDS: Record<20|50|100,number> = {20:18*60,50:45*60,100:90*60};
export const MOCK_GENERATION_BATCH_SIZE = 5;

export type MockMode="mixed"|"reading"|"listening";
export type MockKind="mini"|"full";

export function mockDuration(kind:MockKind,count:number){
  if(kind==="full")return FULL_LISTENING_SECONDS+FULL_READING_SECONDS;
  return MINI_TIME_SECONDS[count as 20|50|100]??Math.max(10*60,Math.round(count*.9*60));
}
