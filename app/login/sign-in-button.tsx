"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function GoogleSignInButton({disabled}:{disabled:boolean}){
  async function signIn(){
    if(disabled)return;
    if(process.env.NODE_ENV!=="production")console.info("OAuth start diagnostic", { oauth_start_called: true });
    const {url,anonKey}=getSupabaseEnv();
    const supabase=createBrowserClient(url,anonKey);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });
    const oauthHost = data.url ? new URL(data.url).hostname : null;
    const allowedOAuthHost = Boolean(
      oauthHost === "accounts.google.com" || oauthHost?.endsWith(".supabase.co"),
    );
    if(process.env.NODE_ENV!=="production")console.info("OAuth URL diagnostic", {
      oauth_error_code: error?.code ?? null,
      oauth_error_message: error?.message ?? null,
      oauth_url_created: Boolean(data.url),
      oauth_url_host_allowed: allowedOAuthHost,
      redirect_to: `${window.location.origin}/auth/callback`,
    });

    if (error || !data.url || !allowedOAuthHost) return;

    if(process.env.NODE_ENV!=="production")console.info("OAuth redirect diagnostic", {
      window_location_assign_executed: true,
    });
    window.location.assign(data.url);
  }
  return <button className="button google-button" disabled={disabled} onClick={signIn}>使用 Google 繼續</button>;
}
