"use client";
import { createBrowserClient } from "@supabase/ssr";
export function GoogleSignInButton({disabled}:{disabled:boolean}){async function signIn(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return;const supabase=createBrowserClient(url,key);await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${window.location.origin}/auth/callback`}})}return <button className="button google-button" disabled={disabled} onClick={signIn}>使用 Google 繼續</button>}
