import type { Metadata } from "next";
import Link from "next/link";
import { AuthFeedbackUrlCleanup } from "@/app/auth-feedback-url-cleanup";
import { requestPasswordReset } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Parolamı Unuttum — Taskavia",
  description: "Taskavia hesabın için güvenli bir parola sıfırlama bağlantısı iste.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="signup-shell login-shell">
      <aside className="signup-aside login-aside">
        <Link className="brand" href="/"><span className="brand-mark">t</span><span>taskavia</span></Link>
        <div className="signup-quote">
          <span>HESABINI KURTAR</span>
          <h2>Yeni bir<br />başlangıç<br />yapalım.</h2>
          <p>E-posta adresine göndereceğimiz güvenli bağlantıyla yeni parolanı belirleyebilirsin.</p>
        </div>
        <div className="login-note"><span>✦</span><p>Güvenliğin için kayıtlı hesap bilgisini bu ekranda paylaşmayız.</p></div>
      </aside>
      <section className="signup-main">
        <div className="signup-form-wrap">
          <Link className="back-link" href="/login">← Giriş sayfasına dön</Link>
          <h1>Parolanı yenile.</h1>
          <p className="signup-subtitle">Hesabında kullandığın e-posta adresini gir.</p>
          {params.message && <p className="success-message" role="status">{params.message}</p>}
          {params.error && <p className="error-message" role="alert">{params.error}</p>}
          {(params.message || params.error) && <AuthFeedbackUrlCleanup />}
          <form action={requestPasswordReset} className="signup-form">
            <div className="field">
              <label htmlFor="email">E-posta</label>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="ornek@email.com" required />
            </div>
            <button type="submit" className="signup-submit">Sıfırlama bağlantısı gönder →</button>
            <p className="auth-switch">Parolanı hatırladın mı? <Link href="/login">Giriş yap</Link></p>
          </form>
        </div>
      </section>
    </main>
  );
}
