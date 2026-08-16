import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  const supabase = createSupabaseRouteClient(request, response);
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Supabase sign out failed", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
  }

  return response;
}
