"use client";
import { useCallback,useEffect,useMemo,useState,useSyncExternalStore } from "react";
import { SpeechSynthesisProvider } from "@/lib/tts/speech-synthesis-provider";
import type { TtsSegment } from "@/lib/tts/provider";

export function useTts(){
  const provider=useMemo(()=>new SpeechSynthesisProvider(),[]);const[status,setStatus]=useState<"idle"|"playing"|"paused">("idle");const[error,setError]=useState("");
  const subscribe=useCallback(()=>()=>{},[]);const supported=useSyncExternalStore(subscribe,()=>provider.isSupported(),()=>true);
  const volume=useSyncExternalStore(subscribeVolume,getVolumeSnapshot,()=>1);
  useEffect(()=>()=>provider.cancel(),[provider]);
  const play=useCallback((segments:TtsSegment[])=>{setError("");provider.speak(segments,{rate:.94,volume,onStart:()=>setStatus("playing"),onEnd:()=>setStatus("idle"),onError:(message)=>{setError(message);setStatus("idle");}});},[provider,volume]);
  const setVolume=useCallback((value:number)=>{const next=clampVolume(value);try{window.localStorage.setItem(VOLUME_KEY,String(next));}catch{/* Storage may be disabled; keep the current page usable. */}window.dispatchEvent(new Event(VOLUME_EVENT));},[]);
  const pause=useCallback(()=>{provider.pause();setStatus("paused");},[provider]);const resume=useCallback(()=>{provider.resume();setStatus("playing");},[provider]);const cancel=useCallback(()=>{provider.cancel();setStatus("idle");},[provider]);
  return useMemo(()=>({status,error,play,pause,resume,cancel,supported,volume,setVolume}),[status,error,play,pause,resume,cancel,supported,volume,setVolume]);
}
function clampVolume(value:number){return Math.min(1,Math.max(0,value));}
const VOLUME_KEY="toeic-tts-volume",VOLUME_EVENT="toeic-tts-volume-change";
function getVolumeSnapshot(){try{const saved=window.localStorage.getItem(VOLUME_KEY),parsed=saved===null?1:Number(saved);return Number.isFinite(parsed)?clampVolume(parsed):1;}catch{return 1;}}
function subscribeVolume(onChange:()=>void){window.addEventListener("storage",onChange);window.addEventListener(VOLUME_EVENT,onChange);return()=>{window.removeEventListener("storage",onChange);window.removeEventListener(VOLUME_EVENT,onChange);};}
