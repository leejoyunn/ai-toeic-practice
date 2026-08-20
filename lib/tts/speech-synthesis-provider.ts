import type { TtsPlaybackOptions,TtsProvider,TtsSegment } from "@/lib/tts/provider";

export class SpeechSynthesisProvider implements TtsProvider{
  private runId=0;
  isSupported(){return typeof window!=="undefined"&&"speechSynthesis" in window&&"SpeechSynthesisUtterance" in window;}
  speak(segments:TtsSegment[],options:TtsPlaybackOptions={}){
    if(!this.isSupported()){options.onError?.("此瀏覽器不支援語音播放，建議使用最新版 Chrome、Edge 或 Safari。");return;}
    this.cancel();const runId=this.runId;const start=(voices:SpeechSynthesisVoice[])=>{
      if(runId!==this.runId)return;if(!voices.length){options.onError?.("找不到可用的英文語音，請先在系統中安裝 English voice。");return;}
      let index=0;const speakerMap=new Map<string,SpeechSynthesisVoice>();
      const playNext=()=>{if(runId!==this.runId)return;const segment=segments[index];if(!segment){options.onEnd?.();return;}const utterance=new SpeechSynthesisUtterance(segment.text);const speakerKey=segment.speaker??"default";if(!speakerMap.has(speakerKey))speakerMap.set(speakerKey,voices[speakerMap.size%voices.length]??voices[0]);utterance.voice=speakerMap.get(speakerKey)??voices[0];utterance.lang=utterance.voice?.lang||"en-US";utterance.volume=clampVolume(options.volume??1);utterance.rate=options.rate??0.94;utterance.pitch=voices.length>1?1:1+Math.min(speakerMap.size-1,2)*0.04;utterance.onstart=()=>{if(index===0)options.onStart?.();};utterance.onend=()=>{index+=1;const delay=segment.pauseAfterMs??0;if(delay>0)window.setTimeout(playNext,delay);else playNext();};utterance.onerror=()=>{if(runId===this.runId)options.onError?.("語音播放失敗，請重新播放或更換瀏覽器英文語音。");};window.speechSynthesis.speak(utterance);};playNext();
    };
    const voices=this.englishVoices();if(voices.length){start(voices);return;}
    let settled=false;const onVoicesChanged=()=>{const loaded=this.englishVoices();if(!loaded.length||settled)return;settled=true;window.speechSynthesis.removeEventListener("voiceschanged",onVoicesChanged);start(loaded);};window.speechSynthesis.addEventListener("voiceschanged",onVoicesChanged);window.setTimeout(()=>{if(settled||runId!==this.runId)return;settled=true;window.speechSynthesis.removeEventListener("voiceschanged",onVoicesChanged);start(this.englishVoices());},1200);
  }
  pause(){if(this.isSupported())window.speechSynthesis.pause();}
  resume(){if(this.isSupported())window.speechSynthesis.resume();}
  cancel(){this.runId+=1;if(this.isSupported())window.speechSynthesis.cancel();}
  private englishVoices(){const voices=window.speechSynthesis.getVoices();const english=voices.filter((voice)=>/^en[-_]/i.test(voice.lang));return english.sort((a,b)=>voiceRank(a)-voiceRank(b));}
}
function voiceRank(voice:SpeechSynthesisVoice){if(/^en-US$/i.test(voice.lang))return 0;if(/^en-GB$/i.test(voice.lang))return 1;return 2;}
function clampVolume(value:number){return Math.min(1,Math.max(0,value));}
