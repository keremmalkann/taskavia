export default function Loading() {
  return (
    <main className="system-state-shell system-loading-shell">
      <section className="system-state-card">
        <div className="system-state-brand system-loading-brand" aria-hidden="true">
          <span>T</span>
          Taskavia
        </div>
        <div className="system-loading-grid">
          <div className="system-loading-copy">
            <span className="system-loading-eyebrow">FİKİRDEN BİRLİKTE ÜRETMEYE</span>
            <h1>Bir sonraki güzel iş burada başlar.</h1>
            <p>Projeler, yetenekler ve yeni fırsatlar bir arada.</p>
            <div className="system-loading-tags" aria-hidden="true">
              <span>Keşfet</span><span>Bağlantı kur</span><span>Birlikte üret</span>
            </div>
          </div>
          <div className="system-loading-visual" aria-hidden="true">
            <span className="system-loading-orbit" />
            <span className="system-loading-monogram">T</span>
          </div>
        </div>
        <div className="system-loading-footer">
          <p className="system-loading-message" role="status" aria-live="polite">Çalışma alanın hazırlanıyor…</p>
          <span className="system-loading-dots" aria-hidden="true"><i /><i /><i /></span>
        </div>
      </section>
    </main>
  );
}
