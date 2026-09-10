import Link from 'next/link'
import type { ReactNode } from 'react'

type LegalSection = {
  title: string
  content: ReactNode
}

export function LegalPage({ eyebrow, title, summary, sections }: { eyebrow: string; title: string; summary: string; sections: LegalSection[] }) {
  return <main className="legal-shell">
    <nav className="legal-nav" aria-label="Hukuki sayfa gezinmesi">
      <Link className="brand" href="/"><span className="brand-mark">t</span><span>taskavia</span></Link>
      <Link href="/">Ana sayfaya dön →</Link>
    </nav>
    <header className="legal-hero">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <span>{summary}</span>
      <small>Son güncelleme: 10 Eylül 2026</small>
    </header>
    <div className="legal-layout">
      <aside aria-label="Sayfa içeriği">
        <strong>İÇİNDEKİLER</strong>
        {sections.map((section, index) => <a href={`#legal-${index + 1}`} key={section.title}>{String(index + 1).padStart(2, '0')} · {section.title}</a>)}
      </aside>
      <article className="legal-content">
        {sections.map((section, index) => <section id={`legal-${index + 1}`} key={section.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{section.title}</h2>{section.content}</div></section>)}
      </article>
    </div>
    <div className="legal-footer-links"><Link href="/terms">Kullanım koşulları</Link><Link href="/privacy">Gizlilik ve KVKK</Link><Link href="/cookies">Çerez politikası</Link></div>
  </main>
}
