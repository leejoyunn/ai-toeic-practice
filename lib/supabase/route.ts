import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "./env";

export interface AuthCookieDiagnostic {
  name: string;
  path: string | null;
  sameSite: string | boolean | null;
  secure: boolean;
  domain: string | null;
}

export function createSupabaseRouteClient(
  request: NextRequest,
  response: NextResponse,
  onCookiesSet?: (cookies: AuthCookieDiagnostic[]) => void,
) {
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        onCookiesSet?.(
          cookiesToSet.map(({ name, options }) => ({
            name,
            path: options.path ?? null,
            sameSite: options.sameSite ?? null,
            secure: options.secure ?? false,
            domain: options.domain ?? null,
          })),
        );
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}
