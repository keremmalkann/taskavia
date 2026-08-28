import type { Metadata } from "next";
import Link from "next/link";
import { AuthFeedbackUrlCleanup } from "@/app/auth-feedback-url-cleanup";
import { updatePassword } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yeni Parola Belirle — İşlik",
  description: "İşlik hesabın için yeni ve güvenli bir parola belirle.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="signup-shell login-shell">
      <aside className="signup-aside login-aside">
        <Link className="brand" href="/"><span className="brand-mark">i</span><span>işlik</span></Link>
        <div className="signup-quote">
          <span>GÜVENLİ PAROLA</span>
          <h2>Hesabını<br />yeniden<br />güvenceye al.</h2>
          <p>Başka bir yerde kullanmadığın, en az 8 karakterli güçlü bir parola seç.</p>
        </div>
        <div className="login-note"><span>✦</span><p>Parola değiştiğinde diğer açık oturumlar güvenlik için kapatılır.</p></div>
      </aside>
      <section className="signup-main">
        <div className="signup-form-wrap">
          <Link className="back-link" href="/login">← Giriş sayfasına dön</Link>
          <h1>Yeni parola belirle.</h1>
          <p className="signup-subtitle">Yeni parolanı iki kez girerek değişikliği onayla.</p>
          {params.message && <p className="success-message" role="status">{params.message}</p>}
          {params.error && <p className="error-message" role="alert">{params.error}</p>}
          {(params.message || params.error) && <AuthFeedbackUrlCleanup />}
          {user ? (
            <form action={updatePassword} className="signup-form">
              <div className="field">
                <label htmlFor="password">Yeni parola</label>
                <input id="password" name="password" type="password" autoComplete="new-password" placeholder="En az 8 karakter" minLength={8} required />
              </div>
              <div className="field">
                <label htmlFor="passwordConfirmation">Yeni parola tekrar</label>
                <input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" placeholder="Yeni parolanı tekrar gir" minLength={8} required />
              </div>
              <button type="submit" className="signup-submit">Parolamı güncelle →</button>
            </form>
          ) : (
            <div className="reset-link-expired">
              <p className="error-message" role="alert">Sıfırlama oturumu bulunamadı veya bağlantının süresi dolmuş.</p>
              <Link className="signup-submit reset-request-link" href="/forgot-password">Yeni bağlantı iste →</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
