'use client'

import { useState } from 'react'
import { categories, projectGuidance, workModes } from '@/lib/it-project'

export function JobProjectFields() {
  const [category, setCategory] = useState<(typeof categories)[number] | ''>('')
  const [mode, setMode] = useState('Uzaktan')
  const guidance = category ? projectGuidance[category] : null
  return <>
    <label>Uzmanlık alanı<select name="category" required value={category} onChange={(event) => setCategory(event.target.value as typeof category)}><option value="" disabled>Teknik kategori seç</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>İlan başlığı<input name="title" required minLength={5} maxLength={140} placeholder={guidance ? 'Örn. ' + guidance.title : 'Çözülmesini istediğin teknik ihtiyacı özetle'} /></label>
    <label>İhtiyaç ve kapsam<textarea name="description" required minLength={20} maxLength={2500} rows={6} placeholder="Mevcut sorunu, hedefi ve kapsam dışı işleri anlat." /><small className="field-guidance" aria-live="polite">{guidance?.hint ?? 'Kategori seçtiğinde teknik kapsam önerileri burada gösterilir.'}</small></label>
    <label>Gerekli teknolojiler ve beceriler<input name="skills" maxLength={400} placeholder={guidance?.skills ?? 'Teknolojileri virgülle ayır'} /></label>
    <fieldset className="it-project-details"><legend>Teknik ortam ve çalışma koşulları</legend>
      <p className="it-form-warning">Bu bilgiler ilan detayında görünür. Şifre, özel anahtar, erişim bağlantısı, açık IP veya kişisel veri paylaşma.</p>
      <label>Mevcut altyapı<textarea name="environment" required minLength={5} maxLength={600} rows={3} placeholder="İşletim sistemi, ürün/model, sürüm ve mevcut yapı (hassas bilgi olmadan)" /></label>
      <label>Cihaz / kullanıcı / şube sayısı<input name="scopeSize" required maxLength={120} placeholder="Örn. 3 sunucu, 40 kullanıcı, 2 şube; bilinmiyorsa belirt" /></label>
      <div className="form-grid two"><label>Çalışma şekli<select name="workMode" value={mode} onChange={(event) => setMode(event.target.value)}>{workModes.map((item) => <option key={item}>{item}</option>)}</select></label>{mode !== 'Uzaktan' && <label>Şehir / ilçe<input name="location" required maxLength={120} placeholder="Örn. İstanbul / Kadıköy; tam adres paylaşma" /></label>}</div>
      <label>Bakım / çalışma zamanı<input name="maintenanceWindow" required minLength={3} maxLength={200} placeholder="Örn. Hafta sonu, en fazla 1 saat kesinti; henüz belli değilse belirt" /></label>
      <label>Teslim ve kabul kriterleri<textarea name="acceptanceCriteria" required minLength={10} maxLength={800} rows={4} placeholder="Yapılacak testler, teslim edilecek dokümanlar, geri dönüş planı ve başarı ölçütleri" /></label>
      <label className="it-confirm"><input type="checkbox" name="authorized" required /><span>Belirtilen sistemler için çalışma talep etmeye yetkiliyim. Erişim yöntemini ve müdahale sınırlarını uzmanla ayrıca netleştireceğim.</span></label>
      {category === 'Siber Güvenlik' && <label className="it-confirm"><input type="checkbox" name="securityScope" required /><span>Güvenlik çalışması başlamadan önce yazılı yetkilendirme, hedef kapsamı ve izin verilen testlerin belirlenmesi gerektiğini kabul ediyorum.</span></label>}
    </fieldset>
  </>
}
