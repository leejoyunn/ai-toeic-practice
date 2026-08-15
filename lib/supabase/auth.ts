import type { AuthUser } from "@/types/user";
import { createSupabaseServerClient } from "./server";
export async function getCurrentUser():Promise<AuthUser|null>{ const supabase=await createSupabaseServerClient(); if(!supabase)return null; const {data}=await supabase.auth.getUser(); const user=data.user; if(!user)return null; return {id:user.id,email:user.email??null,name:user.user_metadata.full_name??user.user_metadata.name??null,avatarUrl:user.user_metadata.avatar_url??null}; }
