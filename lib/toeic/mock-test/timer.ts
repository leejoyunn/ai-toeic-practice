export function remainingSeconds(durationSeconds:number,timerStartedAt:string|null,now=Date.now(),savedRemaining?:number|null){
  if(!timerStartedAt)return Math.max(0,savedRemaining??durationSeconds);
  return Math.max(0,durationSeconds-Math.floor((now-new Date(timerStartedAt).getTime())/1000));
}
export function formatTime(seconds:number){const safe=Math.max(0,seconds),hours=Math.floor(safe/3600),minutes=Math.floor(safe%3600/60),secs=safe%60;return hours?`${hours}:${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`:`${minutes}:${String(secs).padStart(2,"0")}`;}
