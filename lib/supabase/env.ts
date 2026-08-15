export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

function readSupabaseEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
  } catch {
    return null;
  }

  // Catch the common `.env.local` mistake `NAME=NAME=value` without exposing it.
  if (
    url.startsWith("NEXT_PUBLIC_SUPABASE_URL=") ||
    anonKey.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")
  ) return null;

  return { url, anonKey };
}

export function hasSupabaseEnv() {
  return readSupabaseEnv() !== null;
}

export function getSupabaseEnv() {
  const env = readSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase 環境變數格式無效。請確認每行只有一個變數名稱與一個值。",
    );
  }
  return env;
}
