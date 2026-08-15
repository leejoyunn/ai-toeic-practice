import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv, hasSupabaseEnv } from "./env";

export async function createSupabaseServerClient(){
  if(!hasSupabaseEnv()) return null;
  const {url,anonKey}=getSupabaseEnv(); const store=await cookies();
  return createServerClient(url,anonKey,{cookies:{getAll:()=>store.getAll(),setAll(items){try{items.forEach(({name,value,options})=>store.set(name,value,options));}catch{/* Server Components cannot always write cookies. */}}}});
}
