'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setJobFavorite } from '@/lib/actions/favorites'

export function FavoriteButton({ jobId, saved, title }: { jobId: string; saved: boolean; title: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()
  return <div className="favorite-control">
    <button className={`favorite-button${saved ? ' saved' : ''}`} type="button" disabled={pending} aria-pressed={saved} aria-label={`${title}: ${saved ? 'Favorilerden kaldır' : 'Favorilere ekle'}`} onClick={() => {
      setError('')
      startTransition(async () => {
        try {
          const result = await setJobFavorite(jobId, !saved)
          if (result.error) setError(result.error)
          else router.refresh()
        } catch { setError('İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.') }
      })
    }}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7"><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg><span>{pending ? 'Kaydediliyor…' : saved ? 'Kaydedildi' : 'Kaydet'}</span></button>
    {error && <p className="favorite-error" role="alert">{error}</p>}
  </div>
}
