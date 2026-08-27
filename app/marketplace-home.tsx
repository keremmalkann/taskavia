"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type Project = { title: string; company: string; category: string; budget: string; duration: string; skills: string[]; accent: string };

const projects: Project[] = [
  { title: "Fintech mobil uygulama arayüzü", company: "Nova Finans", category: "Tasarım", budget: "₺45.000 – ₺65.000", duration: "4–6 hafta", skills: ["Figma", "UI/UX", "Prototip"], accent: "NF" },
  { title: "Next.js e-ticaret deneyimi", company: "Mori Studio", category: "Yazılım", budget: "₺70.000 – ₺95.000", duration: "6–8 hafta", skills: ["Next.js", "TypeScript", "API"], accent: "MS" },
  { title: "Yeni marka için içerik sistemi", company: "Luma Living", category: "Pazarlama", budget: "₺28.000 – ₺36.000", duration: "Aylık", skills: ["Strateji", "Sosyal medya", "Metin"], accent: "LL" },
  { title: "B2B ürün tanıtım animasyonu", company: "Truva Teknoloji", category: "Video", budget: "₺32.000 – ₺48.000", duration: "3–4 hafta", skills: ["Motion", "3D", "Kurgu"], accent: "TT" },
];
const categories = ["Tümü", "Yazılım", "Tasarım", "Pazarlama", "Video"];
const talent = [
  { name: "Deniz Acar", role: "Ürün Tasarımcısı", score: "4.9", jobs: "36 proje", initials: "DA", tone: "peach" },
  { name: "Mert Kaya", role: "Full-stack Geliştirici", score: "5.0", jobs: "51 proje", initials: "MK", tone: "blue" },
  { name: "Ece Yalın", role: "Marka Stratejisti", score: "4.8", jobs: "29 proje", initials: "EY", tone: "lime" },
];

export default function MarketplaceHome() {
  const [activeCategory, setActiveCategory] = useState("Tümü");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const filteredProjects = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("tr-TR");
    return projects.filter((project) => {
      const inCategory = activeCategory === "Tümü" || project.category === activeCategory;
      const haystack = [project.title, project.company, project.category, ...project.skills].join(" ").toLocaleLowerCase("tr-TR");
      return inCategory && (!needle || haystack.includes(needle));
    });
  }, [activeCategory, search]);
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSearch(query);
    document.querySelector("#projeler")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main>
      <nav className="site-nav" aria-label="Ana navigasyon">
        <Link className="brand" href="/" aria-label="İşlik ana sayfa"><span className="brand-mark" aria-hidden="true">i</span><span>işlik</span></Link>
        <div className="nav-links"><a href="#projeler">İş bul</a><a href="#yetenekler">Yetenek bul</a><a href="#nasil-calisir">Nasıl çalışır?</a></div>
        <div className="nav-actions"><Link className="text-link" href="/login">Giriş yap</Link><Link className="button button-dark button-small" href="/signup">Ücretsiz katıl <span aria-hidden="true">↗</span></Link></div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Türkiye&apos;nin yaratıcı iş ağı</div>
          <h1>İyi iş, doğru<br /><em>yetenekle</em> başlar.</h1>
          <p className="hero-lede">Alanında iyi insanlarla tanış, güvenle çalış ve fikrini birlikte hayata geçir.</p>
          <form className="search-bar" onSubmit={handleSearch} role="search">
            <span className="search-icon" aria-hidden="true">⌕</span><label className="sr-only" htmlFor="project-search">İş veya yetenek ara</label>
            <input id="project-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hangi konuda desteğe ihtiyacın var?" />
            <button type="submit">Ara</button>
          </form>
          <div className="trust-row" aria-label="Platform istatistikleri"><div><strong>12.000+</strong><span>uzman profil</span></div><div><strong>₺48M</strong><span>tamamlanan iş</span></div><div><strong>%96</strong><span>memnuniyet</span></div></div>
        </div>
        <div className="hero-visual" aria-label="Öne çıkan proje ve freelancer önizlemesi">
          <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="floating-pill pill-top"><span>●</span> Yeni proje</div>
          <article className="project-preview">
            <div className="preview-top"><span className="preview-label">Öne çıkan iş</span><span className="bookmark" aria-hidden="true">◇</span></div><div className="preview-brand">K</div>
            <h2>SaaS ürünü için<br />marka kimliği</h2><p>Kapsamlı bir görsel dil, logo sistemi ve dijital marka rehberi.</p>
            <div className="preview-tags"><span>Branding</span><span>Logo</span><span>UI Kit</span></div><div className="preview-footer"><span>Proje bütçesi</span><strong>₺55.000</strong></div>
          </article>
          <div className="talent-bubble"><div className="bubble-avatar">SU</div><div><strong>Selin Uçar</strong><span>Top Rated · 4.9 ★</span></div><div className="online-dot" aria-label="Çevrimiçi" /></div>
          <div className="floating-note">Eşleşme<br /><strong>%98</strong></div>
        </div>
      </section>

      <section className="logo-strip" aria-label="İşlik kullanan markalar"><span>monday</span><span className="logo-serif">MAVİ</span><span>iyzico</span><span className="logo-serif">VAKKO</span><span>Getir</span><span className="logo-serif">Kolektif</span></section>

      <section className="section projects-section" id="projeler">
        <div className="section-heading"><div><span className="section-kicker">FIRSATLARI KEŞFET</span><h2>Bugün başlayan işler</h2></div><p>Yeteneğine ve hedeflerine uygun, net kapsamlı projeler arasından seçimini yap.</p></div>
        <div className="category-tabs" role="group" aria-label="Proje kategorileri">{categories.map((category) => <button className={activeCategory === category ? "active" : ""} key={category} onClick={() => setActiveCategory(category)} type="button">{category}</button>)}</div>
        <div className="project-grid" aria-live="polite">{filteredProjects.map((project, index) => (
          <article className="project-card" key={project.title}>
            <div className="card-meta"><span>{project.category}</span><span>{index + 1}g önce</span></div><div className="company-row"><div className="company-avatar">{project.accent}</div><span>{project.company}</span></div><h3>{project.title}</h3>
            <div className="skill-list">{project.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
            <div className="card-bottom"><div><small>Bütçe</small><strong>{project.budget}</strong></div><div><small>Süre</small><strong>{project.duration}</strong></div><button aria-label={`${project.title} detayını aç`}>→</button></div>
          </article>
        ))}</div>
        {filteredProjects.length === 0 && <div className="empty-state">Bu aramayla eşleşen proje bulamadık. Başka bir kelime ya da kategori dene.</div>}
      </section>

      <section className="talent-section" id="yetenekler">
        <div className="talent-intro"><span className="section-kicker light">SEÇİLMİŞ YETENEKLER</span><h2>İşini gerçekten<br />iyi yapanlar.</h2><p>Portfolyosu ve geçmiş işleri doğrulanmış uzmanlarla daha hızlı ilerle.</p><Link href="/signup" className="arrow-link">Tüm yetenekleri keşfet <span>→</span></Link></div>
        <div className="talent-cards">{talent.map((person, index) => <article className={`talent-card talent-${person.tone}`} key={person.name}><div className="talent-number">0{index + 1}</div><div className="talent-avatar">{person.initials}</div><h3>{person.name}</h3><p>{person.role}</p><div className="talent-stats"><span>★ {person.score}</span><span>{person.jobs}</span></div></article>)}</div>
      </section>

      <section className="section how-section" id="nasil-calisir">
        <div className="section-heading centered"><div><span className="section-kicker">BASİT VE GÜVENLİ</span><h2>Fikirden sonuca, üç adımda</h2></div></div>
        <div className="steps"><article><span className="step-no">01</span><div className="step-icon">✦</div><h3>İhtiyacını anlat</h3><p>Kısa bir proje özeti oluştur. Bütçeni, takvimini ve beklentini paylaş.</p></article><article><span className="step-no">02</span><div className="step-icon">◎</div><h3>Doğru kişiyle eşleş</h3><p>Teklifleri ve portfolyoları karşılaştır, sana en uygun uzmanı seç.</p></article><article><span className="step-no">03</span><div className="step-icon">✓</div><h3>Güvenle tamamla</h3><p>Ödemeni korumaya al, iletişimi tek yerde yürüt ve işi onayla.</p></article></div>
      </section>

      <section className="cta-section"><div className="cta-spark">✦</div><p>Sıradaki iyi iş burada başlıyor.</p><h2>Birlikte üretmeye<br />hazır mısın?</h2><div className="cta-actions"><Link href="/signup" className="button button-light">Freelancer olarak katıl <span>↗</span></Link><Link href="/signup" className="button button-outline-light">Proje yayınla <span>→</span></Link></div></section>
      <footer><Link className="brand footer-brand" href="/"><span className="brand-mark">i</span><span>işlik</span></Link><p>İyi işlerin buluşma noktası.</p><div className="footer-links"><a href="#projeler">İşler</a><a href="#yetenekler">Yetenekler</a><a href="#nasil-calisir">Nasıl çalışır?</a><a href="mailto:merhaba@islik.co">İletişim</a></div><span className="copyright">© 2026 İşlik</span></footer>
    </main>
  );
}
