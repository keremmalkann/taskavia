type LoadingVariant = 'dashboard' | 'list' | 'detail'

function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <span className="route-skeleton-line" style={{ width }} aria-hidden="true" />
}

export function MarketplaceLoading({ variant = 'list', label }: { variant?: LoadingVariant; label: string }) {
  const items = variant === 'dashboard' ? 3 : 4

  return (
    <main className="marketplace-route-loading" aria-busy="true" aria-label={label}>
      <aside className="route-loading-sidebar" aria-hidden="true">
        <div className="route-loading-brand"><span>T</span><strong>Taskavia</strong></div>
        <div className="route-loading-nav">{Array.from({ length: 5 }, (_, index) => <i key={index} />)}</div>
        <div className="route-loading-profile"><b /><SkeletonLine width="58%" /></div>
      </aside>
      <section className="route-loading-content">
        <header className="route-loading-topbar" aria-hidden="true"><SkeletonLine width="118px" /><div><i /><i /></div></header>
        <div className="route-loading-heading" aria-hidden="true">
          <SkeletonLine width="92px" />
          <SkeletonLine width="min(430px, 82%)" />
          <SkeletonLine width="min(520px, 94%)" />
        </div>
        {variant === 'dashboard' ? (
          <>
            <div className="route-loading-stats" aria-hidden="true">{Array.from({ length: 3 }, (_, index) => <article key={index}><SkeletonLine width="42%" /><SkeletonLine width="24%" /><SkeletonLine width="65%" /></article>)}</div>
            <div className="route-loading-section-title" aria-hidden="true"><SkeletonLine width="190px" /><SkeletonLine width="78px" /></div>
          </>
        ) : variant === 'list' ? (
          <div className="route-loading-toolbar" aria-hidden="true"><SkeletonLine width="100%" /><SkeletonLine width="100%" /></div>
        ) : null}
        {variant === 'detail' ? <div className="route-loading-detail" aria-hidden="true"><article><SkeletonLine width="38%" /><SkeletonLine width="94%" /><SkeletonLine width="86%" /><SkeletonLine width="74%" /><SkeletonLine width="52%" /></article><aside><SkeletonLine width="45%" /><SkeletonLine width="76%" /><SkeletonLine width="61%" /></aside></div> : <div className={`route-loading-list ${variant}`} aria-hidden="true">
            {Array.from({ length: items }, (_, index) => <article key={index}>
              <div className="route-loading-card-head"><i /><SkeletonLine width="32%" /></div>
              <SkeletonLine width={index % 2 === 0 ? '62%' : '48%'} />
              <SkeletonLine width="88%" />
              <SkeletonLine width="71%" />
            </article>)}
          </div>}
        <p className="sr-only" role="status">{label}</p>
      </section>
    </main>
  )
}
