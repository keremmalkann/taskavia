import Link from "next/link";
import { signUp } from "@/lib/actions/auth";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="signup-shell">
      <aside className="signup-aside">
        <Link className="brand" href="/"><span className="brand-mark">i</span><span>işlik</span></Link>
        <div className="signup-quote"><span>İYİ İŞLER BURADA BAŞLAR</span><h2>Yeteneğini,<br />doğru insanlarla<br />buluştur.</h2><p>Binlerce bağımsız uzman ve yenilikçi ekip, iyi fikirleri birlikte gerçeğe dönüştürüyor.</p></div>
        <div className="signup-proof"><div className="mini-avatars"><span>DA</span><span>MK</span><span>EY</span></div><span>12.000+ profesyonele katıl</span></div>
      </aside>
      <section className="signup-main"><div className="signup-form-wrap">
        <Link className="back-link" href="/">← Ana sayfaya dön</Link><h1>Aramıza katıl.</h1><p className="signup-subtitle">Ücretsiz hesabını oluştur, yeni fırsatlarla tanış.</p>
        {params.error && <p className="error-message" role="alert">{params.error}</p>}
        <form action={signUp} className="signup-form">
          <div className="field"><label htmlFor="fullName">Ad Soyad</label><input id="fullName" name="fullName" placeholder="Adın ve soyadın" required /></div>
          <div className="field"><label htmlFor="email">E-posta</label><input id="email" name="email" type="email" placeholder="ornek@email.com" required /></div>
          <div className="field"><label htmlFor="password">Şifre</label><input id="password" name="password" type="password" placeholder="En az 6 karakter" required minLength={6} /></div>
          <span className="role-title">Nasıl katılmak istiyorsun?</span>
          <div className="role-options"><label className="role-option"><input type="radio" name="role" value="freelancer" defaultChecked /> Freelancer olarak</label><label className="role-option"><input type="radio" name="role" value="employer" /> İşveren olarak</label></div>
          <button type="submit" className="signup-submit">Hesabımı oluştur →</button><p className="form-note">Kaydolarak kullanım koşullarını ve gizlilik politikasını kabul etmiş olursun.</p>
        </form>
      </div></section>
    </main>
  );
}
