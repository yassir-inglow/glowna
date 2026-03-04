import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "auth_callback_failed");
    return NextResponse.redirect(url.toString());
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "auth_code_exchange_failed");
    return NextResponse.redirect(url.toString());
  }

  return NextResponse.redirect(`${origin}${next}`);
}
