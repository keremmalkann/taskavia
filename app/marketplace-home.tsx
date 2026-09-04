import Link from 'next/link'

const services = [
  { category: 'Sistem Yönetimi', title: 'Sunucularını ve kullanıcılarını yönet.', text: 'Windows/Linux, Active Directory, sanallaştırma ve sistem geçişleri.', icon: '01' },
  { category: 'Ağ & Firewall', title: 'Bağlantını doğru yapılandır.', text: 'Firewall, VPN, VLAN, kablosuz ağ ve şube bağlantıları.', icon: '02' },
  { category: 'Siber Güvenlik', title: 'Güvenlik açıklarını kapat.', text: 'İzinli güvenlik incelemeleri, sistem sıkılaştırma ve erişim kontrolleri.', icon: '03' },
  { category: 'Bulut & Microsoft 365', title: 'Bulut ortamını düzenle.', text: 'Microsoft 365, Azure, AWS, kimlik yönetimi ve bulut geçişleri.', icon: '04' },
  { category: 'Yedekleme & Kurtarma', title: 'Geri dönüşe hazır ol.', text: 'Yedekleme kurulumu, geri yükleme testleri ve kurtarma planları.', icon: '05' },
  { category: 'İzleme & Otomasyon', title: 'Operasyonunu görünür kıl.', text: 'Log yönetimi, izleme, alarm kuralları ve operasyon otomasyonları.', icon: '06' },
]

export default function MarketplaceHome() {
  return <main className="it-home">
    <nav className="site-nav" aria-label="Ana navigasyon">
      <Link className="brand" href="/"><span className="brand-mark">t</span><span>taskavia</span></Link>
      <div className="nav-links"><a href="#uzmanliklar">Uzmanlık alanları</a><Link href="/jobs">IT projeleri</Link><a href="#nasil-calisir">Nasıl çalışır?</a></div>
      <div className="nav-actions"><Link className="text-link" href="/login">Giriş yap</Link><Link className="button button-dark button-small" href="/signup">Katıl ↗</Link></div>
    </nav>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><span /> SİSTEM · AĞ · SİBER GÜVENLİK</div>
        <h1>Altyapın için<br /><em>doğru uzman.</em></h1>
        <p className="hero-lede">Şirketinin IT ihtiyacını tanımla. Sistem, ağ ve güvenlik uzmanlarının tekliflerini karşılaştır; kapsamı belli bir çalışmayla ilerle.</p>
        <div className="it-hero-actions"><Link href="/employer/jobs/new" className="button button-dark">IT projesi oluştur →</Link><Link href="/jobs" className="button">Uzman olarak iş bul ↗</Link></div>
        <div className="it-focus-tags"><span>Uzaktan veya yerinde</span><span>Net teknik kapsam</span><span>Belirlenmiş teslim kriterleri</span></div>
      </div>
      <aside className="it-brief"><span className="section-kicker">ÖRNEK PROJE KAPSAMI</span><h2>Şube ağı ve<br />VPN kurulumu</h2><p>Bir proje ilanında uzmanla paylaşabileceğin bilgiler:</p>
        <dl><div><dt>Ortam</dt><dd>2 şube · 40 kullanıcı</dd></div><div><dt>Teknoloji</dt><dd>Firewall · VLAN · VPN</dd></div><div><dt>Çalışma</dt><dd>Uzaktan · Mesai dışı geçiş</dd></div><div><dt>Teslim</dt><dd>Bağlantı testi ve yapılandırma dokümanı</dd></div></dl>
        <small>Örnek senaryodur; yayınlanmış bir ilan değildir.</small>
      </aside>
    </section>
    <section className="section" id="uzmanliklar"><div className="section-heading"><div><span className="section-kicker">TEKNİK UZMANLIK</span><h2>Hangi alanda destek gerekiyor?</h2></div></div>
      <div className="it-service-grid">{services.map((service) => <Link href={'/jobs?category=' + encodeURIComponent(service.category)} key={service.category} className="it-service-card"><span>{service.icon} / {service.category}</span><h3>{service.title}</h3><p>{service.text}</p><strong>İlanları incele →</strong></Link>)}</div>
    </section>
    <section className="section how-section" id="nasil-calisir"><div className="section-heading"><div><span className="section-kicker">KAPSAMDAN TESLİME</span><h2>Teknik işi birlikte netleştirin.</h2></div></div>
      <div className="steps"><article><span className="step-no">01</span><h3>Ortamı ve hedefi tanımla</h3><p>Teknolojileri, cihaz sayısını, çalışma şeklini ve kabul kriterlerini belirt.</p></article><article><span className="step-no">02</span><h3>Uzmanınla anlaş</h3><p>Profilleri ve teklifleri incele. Müdahale kapsamını ve çalışma takvimini birlikte netleştir.</p></article><article><span className="step-no">03</span><h3>Teslimi kontrol et</h3><p>Çalışma alanında iletişim kur, sonuçları kontrol et ve tamamlanan işi değerlendir.</p></article></div>
    </section>
    <section className="it-safety"><h2>Erişim kontrollü, kapsam açık.</h2><p>Yalnızca sahibi olduğun veya müdahale yetkin bulunan sistemler için iş oluştur. Güvenlik çalışmalarından önce yazılı kapsam ve yetkilendirmeyi netleştir. Şifre, özel anahtar ve erişim bilgilerini ilanlarda veya mesajlarda paylaşma.</p></section>
    <section className="cta-section"><p>IT deneyimini projeye dönüştür.</p><h2>Uzmanlığının<br />karşılığı burada.</h2><div className="cta-actions"><Link href="/signup" className="button button-light">Uzman olarak katıl ↗</Link><Link href="/employer/jobs/new" className="button button-outline-light">Proje oluştur →</Link></div></section>
    <footer><Link className="brand footer-brand" href="/"><span className="brand-mark">t</span><span>taskavia</span></Link><p>Sistem, ağ ve güvenlik uzmanlarının buluşma noktası.</p><div className="footer-links"><Link href="/jobs">IT projeleri</Link><a href="#uzmanliklar">Uzmanlık alanları</a></div><span className="copyright">© 2026 Taskavia</span></footer>
  </main>
}
