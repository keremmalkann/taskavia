'use client'

import Link from 'next/link'
import { useErrorReport } from '@/app/use-error-report'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reference = useErrorReport(error)

  return <html lang="tr"><body style={{ margin: 0, background: '#f1efe7', color: '#17221f', fontFamily: 'Arial, sans-serif' }}>
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section style={{ width: 'min(620px, 100%)', background: '#fffdf8', border: '1px solid #d9d6cc', padding: 40 }}>
        <small style={{ color: '#ff684f', fontWeight: 800, letterSpacing: 2 }}>BEKLENMEYEN BİR DURUM</small>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 42, marginBottom: 12 }}>Taskavia yüklenemedi.</h1>
        <p>Bilgilerin güvende. Tekrar deneyebilir veya ana sayfaya dönebilirsin.</p>
        <p style={{ fontFamily: 'monospace', fontSize: 12 }}>Hata referansı: {reference}</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <button type="button" onClick={reset} style={{ border: 0, padding: '14px 18px', background: '#17221f', color: 'white', fontWeight: 700 }}>Tekrar dene</button>
          <Link href="/" style={{ padding: '14px 18px', color: '#17221f', fontWeight: 700 }}>Ana sayfa</Link>
        </div>
      </section>
    </main>
  </body></html>
}
