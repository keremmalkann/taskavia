import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flowId = requestUrl.searchParams.get("sb_flow_id");
  const isPasswordRecovery = requestUrl.searchParams.get("next") === "/reset-password";
  const loginUrl = new URL("/login", getSiteUrl());

  if (!code) {
    loginUrl.searchParams.set("error", "Doğrulama bağlantısı geçersiz veya eksik.");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  if (error) {
    const errorUrl = new URL(isPasswordRecovery ? "/forgot-password" : "/login", getSiteUrl());
    errorUrl.searchParams.set("error", isPasswordRecovery
      ? "Parola sıfırlama bağlantısının süresi dolmuş veya daha önce kullanılmış."
      : "Doğrulama bağlantısının süresi dolmuş veya daha önce kullanılmış.");
    return NextResponse.redirect(errorUrl);
  }

  if (isPasswordRecovery) {
    const resetUrl = new URL("/reset-password", getSiteUrl());
    resetUrl.searchParams.set("message", "Yeni parolanı belirleyebilirsin.");
    return NextResponse.redirect(resetUrl);
  }

  loginUrl.searchParams.set("message", "E-posta adresin doğrulandı. Artık giriş yapabilirsin.");
  return NextResponse.redirect(loginUrl);
}
