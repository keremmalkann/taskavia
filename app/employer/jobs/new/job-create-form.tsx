'use client'

import { useRef, useState } from 'react'
import { PendingSubmitButton } from '@/app/pending-submit-button'
import { createJob } from '@/lib/actions/marketplace'
import { formatCurrency, formatDate } from '@/lib/marketplace'
import { JobProjectFields } from './job-project-fields'

type Preview = {
  title: string
  description: string
  category: string
  skills: string[]
  budgetMin: number
  budgetMax: number
  deadline: string
}

export function JobCreateForm({ minDeadline }: { minDeadline: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [preview, setPreview] = useState<Preview | null>(null)

  function openPreview() {
    if (!formRef.current) return
    const form = new FormData(formRef.current)
    setPreview({
      title: String(form.get('title') || 'Başlık henüz eklenmedi'),
      description: String(form.get('description') || 'Proje açıklaması henüz eklenmedi.'),
      category: String(form.get('category') || 'Kategori seçilmedi'),
      skills: String(form.get('skills') || '').split(',').map((skill) => skill.trim()).filter(Boolean),
      budgetMin: Number(form.get('budgetMin') || 0),
      budgetMax: Number(form.get('budgetMax') || 0),
      deadline: String(form.get('deadline') || ''),
    })
    dialogRef.current?.showModal()
  }

  return <>
    <form ref={formRef} action={createJob} className="marketplace-form job-create-form">
      <div className="form-section-title"><span>01</span><div><h2>Proje özeti</h2><p>Freelancer’ın ilk bakışta anlayacağı kadar açık ol.</p></div></div>
      <JobProjectFields />
      <div className="form-section-title"><span>02</span><div><h2>Bütçe & takvim</h2><p>Teklif verenlerin kapsamı doğru planlamasına yardımcı olur.</p></div></div>
      <div className="form-grid three"><label>Minimum bütçe (₺)<input name="budgetMin" type="number" min="0" required /></label><label>Maksimum bütçe (₺)<input name="budgetMax" type="number" min="0" required /></label><label>Son tarih<input name="deadline" type="date" min={minDeadline} /></label></div>
      <div className="job-create-actions">
        <button className="job-preview-button" type="button" onClick={openPreview}>İlanı önizle</button>
        <div>
          <PendingSubmitButton className="job-draft-button" name="intent" value="draft" pendingLabel="Taslak kaydediliyor…">Taslak kaydet</PendingSubmitButton>
          <PendingSubmitButton className="marketplace-submit" name="intent" value="publish" pendingLabel="İlan yayınlanıyor…">İlanı yayınla →</PendingSubmitButton>
        </div>
      </div>
      <p className="job-draft-note">Taslak yalnızca senin panelinde görünür. Yayınlamadan önce önizleyebilir ve daha sonra düzenleyebilirsin.</p>
    </form>

    <dialog className="job-preview-dialog" ref={dialogRef} onClick={(event) => {
      if (event.target === dialogRef.current) dialogRef.current.close()
    }}>
      {preview && <article>
        <header><div><span>İLAN ÖNİZLEMESİ</span><h2>{preview.title}</h2><p>{preview.category}</p></div><button type="button" aria-label="Önizlemeyi kapat" onClick={() => dialogRef.current?.close()}>×</button></header>
        <section><h3>Proje hakkında</h3><p>{preview.description}</p><div className="job-preview-skills">{preview.skills.length ? preview.skills.map((skill) => <span key={skill}>{skill}</span>) : <span>Beceri eklenmedi</span>}</div></section>
        <footer><div><small>BÜTÇE</small><strong>{formatCurrency(preview.budgetMin)} – {formatCurrency(preview.budgetMax)}</strong></div><div><small>SON TARİH</small><strong>{preview.deadline ? formatDate(preview.deadline) : 'Belirtilmedi'}</strong></div></footer>
        <button className="job-preview-close" type="button" onClick={() => dialogRef.current?.close()}>Düzenlemeye dön</button>
      </article>}
    </dialog>
  </>
}
