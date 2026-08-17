export interface TtsSegment{text:string;speaker?:string;label?:string}
export interface TtsPlaybackOptions{rate?:number;onStart?:()=>void;onEnd?:()=>void;onError?:(message:string)=>void}
export interface TtsProvider{isSupported():boolean;speak(segments:TtsSegment[],options?:TtsPlaybackOptions):void;pause():void;resume():void;cancel():void;}
