import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/profile";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const incomingCookieNames = request.cookies.getAll().map(({ name }) => name);
  const verifierCookieFound = incomingCookieNames.some((name) =>
    name.endsWith("-code-verifier"),
  );

  console.info("OAuth callback diagnostic", {
    callback_code_received: Boolean(code),
    flow_id_received: Boolean(flowId),
    verifier_cookie_found: verifierCookieFound,
    incoming_supabase_cookie_names: incomingCookieNames.filter((name) =>
      name.startsWith("sb-"),
    ),
  });

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_callback_missing_code", request.url),
    );
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  let sessionCookieWritten = false;
  const supabase = createSupabaseRouteClient(request, response, (cookies) => {
    sessionCookieWritten ||= cookies.some(
      ({ name }) => !name.endsWith("-code-verifier"),
    );
    console.info("OAuth response cookie diagnostic", {
      session_cookie_written: sessionCookieWritten,
      cookies,
    });
  });
  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  if (error) {
    console.error("Supabase OAuth code exchange failed", {
      exchange_success: false,
      session_cookie_written: sessionCookieWritten,
      code: error.code,
      status: error.status,
      message: error.message,
    });
    return NextResponse.redirect(
      new URL("/login?error=oauth_callback_exchange_failed", request.url),
    );
  }

  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();
  console.info("OAuth session diagnostic", {
    exchange_success: true,
    session_cookie_written: sessionCookieWritten,
    server_user_found: Boolean(user) && !getUserError,
    get_user_error_code: getUserError?.code ?? null,
  });

  if (!user || getUserError) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_callback_session_missing", request.url),
    );
  }

  return response;
}
