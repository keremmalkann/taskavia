'use client'

import { useState, type FormEvent } from 'react'
import { createProposal } from '@/lib/actions/marketplace'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value)
}

export function ProposalForm({ jobId, minimumBudget }: { jobId: string; minimumBudget: number }) {
  const [priceWarning, setPriceWarning] = useState('')

  function validatePrice(event: FormEvent<HTMLInputElement>) {
    const field = event.currentTarget
    const price = field.value === '' ? null : Number(field.value)
    const warning = price != null && Number.isFinite(price) && price < minimumBudget
      ? `Teklif tutarı ilanın minimum bütçesi olan ${formatCurrency(minimumBudget)} tutarından az olamaz.`
      : ''
    field.setCustomValidity(warning)
    setPriceWarning(warning)
  }

  return <form action={createProposal.bind(null, jobId)} className="compact-form">
    <h2>Teklif gönder</h2>
    <label>Teklif tutarı (₺)
      <input name="price" type="number" min={minimumBudget} step="1" required placeholder={String(minimumBudget)} onInput={validatePrice} aria-describedby={priceWarning ? 'proposal-price-guidance proposal-price-warning' : 'proposal-price-guidance'} />
      <small id="proposal-price-guidance" className="proposal-price-guidance">Bu ilan için en düşük teklif: {formatCurrency(minimumBudget)}</small>
      {priceWarning && <small id="proposal-price-warning" className="proposal-price-warning" role="alert">{priceWarning}</small>}
    </label>
    <label>Teslim süresi (gün)<input name="durationDays" type="number" min="1" step="1" required placeholder="Örn. 7" /></label>
    <label>Kısa mesaj<textarea name="message" minLength={10} rows={5} required /></label>
    <button type="submit">Teklifimi gönder →</button>
  </form>
}
