"use client";

import Link from "next/link";
import { useErrorReport } from "@/app/use-error-report";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const reference = useErrorReport(error);

  return (
    <main className="system-state-shell">
      <section className="system-state-card" aria-labelledby="error-title">
        <Link className="system-state-brand" href="/" aria-label="Taskavia ana sayfa">
          <span aria-hidden="true">T</span>
          Taskavia
        </Link>

        <div className="system-state-layout">
          <div className="system-state-code" aria-hidden="true">
            !
          </div>
          <div className="system-state-copy">
            <p className="system-state-kicker">BEKLENMEYEN BİR DURUM</p>
            <h1 id="error-title">Bir şeyler ters gitti.</h1>
            <p>
              İşlemin tamamlanamadı. Bilgilerin güvende; tekrar deneyebilir veya ana
              sayfaya dönebilirsin.
            </p>
            <small className="system-state-reference">Hata referansı: {reference}</small>
            <div className="system-state-actions">
              <button type="button" onClick={retry}>
                Tekrar dene <span aria-hidden="true">↻</span>
              </button>
              <Link href="/">Ana sayfaya dön →</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
