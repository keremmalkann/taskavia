'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { editJob } from '@/lib/actions/edit-job'
import './edit-job.css'

export function EditJobForm({ job }: { job: { id: string; title: string; description: string; updated_at: string } }) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return <form className="marketplace-form job-edit-form" action={(form) => {
    setError('')
    startTransition(async () => {
      try {
        const result = await editJob(job.id, job.updated_at, form)
        if (result.error) setError(result.error)
        else { router.replace(`/jobs/${job.id}?message=${encodeURIComponent('Projen güncellendi.')}`); router.refresh() }
      } catch { setError('Bağlantı kurulamadı. Bilgilerin burada duruyor; tekrar deneyebilirsin.') }
    })
  }}>
    <p>Başlığı ve açıklamayı güncelleyebilirsin. Bütçe, kategori ve takvim bu ekranda değiştirilmez; her kayıt düzenleme geçmişine işlenir.</p>
    {error && <p role="alert">{error}</p>}
    <label>İlan başlığı<input name="title" defaultValue={job.title} minLength={5} maxLength={140} required disabled={pending} /></label>
    <label>Proje açıklaması<textarea name="description" defaultValue={job.description} minLength={20} maxLength={5000} rows={12} required disabled={pending} /></label>
    <div className="job-edit-actions"><Link href={`/jobs/${job.id}`}>Vazgeç</Link><button className="marketplace-submit" disabled={pending} type="submit">{pending ? 'Kaydediliyor…' : 'Değişiklikleri kaydet →'}</button></div>
  </form>
}
