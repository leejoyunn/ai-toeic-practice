"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function GoogleSignInButton({disabled}:{disabled:boolean}){
  async function signIn(){
    if(disabled)return;
    const {url,anonKey}=getSupabaseEnv();
    const supabase=createBrowserClient(url,anonKey);
    await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${window.location.origin}/auth/callback`}});
  }
  return <button className="button google-button" disabled={disabled} onClick={signIn}>使用 Google 繼續</button>;
}
