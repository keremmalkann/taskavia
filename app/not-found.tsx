import Link from "next/link";

export default function NotFound() {
  return (
    <main className="system-state-shell">
      <section className="system-state-card" aria-labelledby="not-found-title">
        <Link className="system-state-brand" href="/" aria-label="Taskavia ana sayfa">
          <span aria-hidden="true">T</span>
          Taskavia
        </Link>

        <div className="system-state-layout">
          <div className="system-state-code system-state-code-wide" aria-hidden="true">
            404
          </div>
          <div className="system-state-copy">
            <p className="system-state-kicker">SAYFA BULUNAMADI</p>
            <h1 id="not-found-title">Aradığın sayfa burada değil.</h1>
            <p>
              Bağlantı değişmiş, kaldırılmış veya yanlış yazılmış olabilir. Güvenli
              bir başlangıç noktasına dönerek devam edebilirsin.
            </p>
            <div className="system-state-actions">
              <Link className="system-state-primary-link" href="/">
                Ana sayfaya dön <span aria-hidden="true">→</span>
              </Link>
              <Link href="/login">Hesabına giriş yap →</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
