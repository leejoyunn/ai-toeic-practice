import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const schema=z.object({targetScore:z.number().int().min(300).max(990)});
export async function PATCH(request:Request){try{const{targetScore}=schema.parse(await request.json()),supabase=await createSupabaseServerClient();if(!supabase)return NextResponse.json({error:"尚未設定 Supabase。"},{status:503});const{data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"請先登入。"},{status:401});const{error}=await supabase.from("profiles").update({target_score:targetScore,updated_at:new Date().toISOString()}).eq("id",user.id);if(error)throw new Error(error.message);return NextResponse.json({ok:true,targetScore});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"無法更新目標分數。"},{status:400});}}
