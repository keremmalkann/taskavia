'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { manageProposal } from '@/lib/actions/proposals'
import './proposal-manager.css'

export function ProposalManager({ proposal, minimumBudget }: { proposal: { id: string; price: number; duration_days: number; message: string; updated_at: string }; minimumBudget: number }) {
  const [mode, setMode] = useState<'edit' | 'withdraw' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  function submit(form: FormData, operation: 'edit' | 'withdraw') {
    setError(''); setSuccess('')
    startTransition(async () => {
      try {
        const result = await manageProposal(proposal.id, proposal.updated_at, operation, form)
        if (result.error) setError(result.error)
        else { setSuccess(result.success ?? 'Kaydedildi.'); setMode(null); router.refresh() }
      } catch { setError('Bağlantı kurulamadı. Tekrar dene.') }
    })
  }
  return <section className="proposal-manager" id="manage-proposal" aria-label="Teklifini yönet">
    <div className="proposal-manage-buttons"><button disabled={pending} type="button" onClick={() => {setMode('edit'); setError(''); setSuccess('')}}>Teklifi düzenle</button><button disabled={pending} type="button" onClick={() => {setMode('withdraw'); setError(''); setSuccess('')}}>Geri çek</button></div>
    {error && <p role="alert">{error}</p>}{success && <p role="status">{success}</p>}
    {mode === 'edit' && <form action={(data) => submit(data, 'edit')}>
      <h3>Teklifini güncelle</h3><p>İlanın minimum bütçesi: {minimumBudget.toLocaleString('tr-TR')} ₺</p>
      <label>Tutar (₺)<input name="price" type="number" min={Math.max(.01, minimumBudget)} max="9999999999.99" step="0.01" defaultValue={proposal.price} required /></label>
      <label>Teslim (gün)<input name="durationDays" type="number" min="1" max="3650" step="1" defaultValue={proposal.duration_days} required /></label>
      <label>Mesaj<textarea name="message" minLength={10} maxLength={2000} rows={5} defaultValue={proposal.message} required /></label>
      <button disabled={pending} type="submit">{pending ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}</button><button disabled={pending} type="button" onClick={() => setMode(null)}>Vazgeç</button>
    </form>}
    {mode === 'withdraw' && <form action={(data) => submit(data, 'withdraw')}><h3>Teklifi geri çek?</h3><p>İşveren artık bu teklifi kabul edemez. Bu işlem geri alınamaz; bu ilana yeniden teklif gönderemezsin.</p><button disabled={pending} type="submit">{pending ? 'İşleniyor…' : 'Evet, teklifimi geri çek'}</button><button disabled={pending} type="button" onClick={() => setMode(null)}>Vazgeç</button></form>}
  </section>
}
