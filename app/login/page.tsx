import type { Metadata } from "next";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { AuthFeedbackUrlCleanup } from "@/app/auth-feedback-url-cleanup";
import { LoginHistoryGuard } from "@/app/login-history-guard";
import { PendingSubmitButton } from "@/app/pending-submit-button";

export const metadata: Metadata = {
  title: "Giriş Yap — Taskavia",
  description: "Taskavia hesabına giriş yap ve yeni fırsatlara kaldığın yerden devam et.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="signup-shell login-shell">
      <LoginHistoryGuard />
      <aside className="signup-aside login-aside">
        <Link className="brand" href="/"><span className="brand-mark">t</span><span>taskavia</span></Link>
        <div className="signup-quote">
          <span>YENİDEN HOŞ GELDİN</span>
          <h2>İyi işler,<br />kaldığın yerden<br />devam eder.</h2>
          <p>Projelerini, tekliflerini ve yeni fırsatlarını tek bir yerde yönet.</p>
        </div>
        <div className="login-note"><span>✦</span><p>Güvenli ödeme, doğrulanmış profiller ve şeffaf iletişim.</p></div>
      </aside>
      <section className="signup-main">
        <div className="signup-form-wrap">
          <Link className="back-link" href="/">← Ana sayfaya dön</Link>
          <h1>Tekrar merhaba.</h1>
          <p className="signup-subtitle">Hesabına giriş yap ve kaldığın yerden devam et.</p>
          {params.message && <p className="success-message" role="status">{params.message}</p>}
          {params.error && <p className="error-message" role="alert">{params.error}</p>}
          {(params.message || params.error) && <AuthFeedbackUrlCleanup />}
          <form action={signIn} className="signup-form">
            <div className="field"><label htmlFor="email">E-posta</label><input id="email" name="email" type="email" autoComplete="email" placeholder="ornek@email.com" required /></div>
            <div className="field">
              <div className="password-label-row"><label htmlFor="password">Şifre</label><Link href="/forgot-password">Parolamı unuttum</Link></div>
              <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Şifren" required minLength={6} />
            </div>
            <PendingSubmitButton className="signup-submit" pendingLabel="Giriş yapılıyor…">Giriş yap →</PendingSubmitButton>
            <p className="auth-switch">Henüz hesabın yok mu? <Link href="/signup">Ücretsiz kayıt ol</Link></p>
          </form>
        </div>
      </section>
    </main>
  );
}
