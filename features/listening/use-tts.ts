"use client";
import { useCallback,useEffect,useMemo,useState,useSyncExternalStore } from "react";
import { SpeechSynthesisProvider } from "@/lib/tts/speech-synthesis-provider";
import type { TtsSegment } from "@/lib/tts/provider";

export function useTts(){
  const provider=useMemo(()=>new SpeechSynthesisProvider(),[]);const[status,setStatus]=useState<"idle"|"playing"|"paused">("idle");const[error,setError]=useState("");
  const subscribe=useCallback(()=>()=>{},[]);const supported=useSyncExternalStore(subscribe,()=>provider.isSupported(),()=>true);
  useEffect(()=>()=>provider.cancel(),[provider]);
  const play=useCallback((segments:TtsSegment[])=>{setError("");provider.speak(segments,{rate:.94,onStart:()=>setStatus("playing"),onEnd:()=>setStatus("idle"),onError:(message)=>{setError(message);setStatus("idle");}});},[provider]);
  const pause=useCallback(()=>{provider.pause();setStatus("paused");},[provider]);const resume=useCallback(()=>{provider.resume();setStatus("playing");},[provider]);const cancel=useCallback(()=>{provider.cancel();setStatus("idle");},[provider]);
  return useMemo(()=>({status,error,play,pause,resume,cancel,supported}),[status,error,play,pause,resume,cancel,supported]);
}
