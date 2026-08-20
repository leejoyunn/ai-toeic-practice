"use client";

import { Volume2 } from "lucide-react";

export function TtsVolumeControl({volume,onChange}:{volume:number;onChange:(volume:number)=>void}){
  const percent=Math.round(volume*100);
  return <label className="tts-volume-control" title={percent===100?"已達瀏覽器語音最大音量；若仍偏小，請檢查 Windows 與 Chrome 音量。":undefined}><Volume2 aria-hidden="true"/><span>語音音量</span><input type="range" min="0" max="100" step="5" value={percent} onChange={(event)=>onChange(Number(event.target.value)/100)} aria-label="語音音量"/><output>{percent}%</output></label>;
}
