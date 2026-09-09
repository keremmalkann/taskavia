export default function Loading() {
  return (
    <main className="system-state-shell system-loading-shell">
      <section className="system-state-card" role="status" aria-live="polite">
        <div className="system-state-brand system-loading-brand" aria-hidden="true">
          <span>T</span>
          Taskavia
        </div>
        <div className="system-loading-grid" aria-hidden="true">
          <div>
            <span className="system-skeleton system-skeleton-label" />
            <span className="system-skeleton system-skeleton-title" />
            <span className="system-skeleton system-skeleton-copy" />
            <span className="system-skeleton system-skeleton-copy short" />
          </div>
          <span className="system-loading-orbit" />
        </div>
        <p className="system-loading-message">İçerik hazırlanıyor…</p>
      </section>
    </main>
  );
}
