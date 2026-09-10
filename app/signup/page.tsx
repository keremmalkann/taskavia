import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { AuthFeedbackUrlCleanup } from "@/app/auth-feedback-url-cleanup";
import { PendingSubmitButton } from "@/app/pending-submit-button";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="signup-shell">
      <aside className="signup-aside">
        <Link className="brand" href="/"><span className="brand-mark">t</span><span>taskavia</span></Link>
        <div className="signup-quote"><span>İYİ İŞLER BURADA BAŞLAR</span><h2>Yeteneğini,<br />doğru insanlarla<br />buluştur.</h2><p>Bağımsız uzmanlar ve yenilikçi ekipler, iyi fikirleri birlikte gerçeğe dönüştürüyor.</p></div>
        <div className="signup-proof"><div className="mini-avatars"><span>İŞ</span><span>FR</span><span>✓</span></div><span>Tekliflerini ve projelerini tek yerden yönet</span></div>
      </aside>
      <section className="signup-main"><div className="signup-form-wrap">
        <Link className="back-link" href="/">← Ana sayfaya dön</Link><h1>Aramıza katıl.</h1><p className="signup-subtitle">Ücretsiz hesabını oluştur, yeni fırsatlarla tanış.</p>
        {params.error && <p className="error-message" role="alert">{params.error}</p>}
        {params.error && <AuthFeedbackUrlCleanup />}
        <form action={signUp} className="signup-form">
          <div className="field"><label htmlFor="fullName">Ad Soyad</label><input id="fullName" name="fullName" autoComplete="name" placeholder="Adın ve soyadın" required /></div>
          <div className="field"><label htmlFor="email">E-posta</label><input id="email" name="email" type="email" autoComplete="email" placeholder="ornek@email.com" required /></div>
          <div className="field"><label htmlFor="password">Şifre</label><input id="password" name="password" type="password" autoComplete="new-password" placeholder="En az 6 karakter" required minLength={6} /></div>
          <span className="role-title">Nasıl katılmak istiyorsun?</span>
          <div className="role-options"><label className="role-option"><input type="radio" name="role" value="freelancer" defaultChecked /> Freelancer olarak</label><label className="role-option"><input type="radio" name="role" value="employer" /> İşveren olarak</label></div>
          <label className="signup-consent"><input type="checkbox" name="termsAccepted" value="accepted" required /><span><Link href="/terms" target="_blank">Kullanım koşullarını</Link> ve <Link href="/privacy" target="_blank">KVKK aydınlatma metnini</Link> okudum.</span></label>
          <PendingSubmitButton className="signup-submit" pendingLabel="Hesap oluşturuluyor…">Hesabımı oluştur →</PendingSubmitButton><p className="auth-switch">Zaten hesabın var mı? <Link href="/login">Giriş yap</Link></p>
        </form>
      </div></section>
    </main>
  );
}
