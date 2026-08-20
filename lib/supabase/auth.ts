import type { AuthUser } from "@/types/user";
import { createSupabaseServerClient } from "./server";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    if(process.env.NODE_ENV!=="production")console.info("Server auth diagnostic", { authenticated: false, reason: "env_missing" });
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if(process.env.NODE_ENV!=="production")console.info("Server auth diagnostic", {
    authenticated: Boolean(user) && !error,
    get_user_error_code: error?.code ?? null,
  });
  if (!user || error) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    name: user.user_metadata.full_name ?? user.user_metadata.name ?? null,
    avatarUrl: user.user_metadata.avatar_url ?? null,
  };
}
