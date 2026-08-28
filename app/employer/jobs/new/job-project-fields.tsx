'use client'

import { useState } from 'react'
import { categories } from '@/lib/marketplace'

type Category = (typeof categories)[number]

const fieldContent: Record<Category, { title: string; description: string; skills: string; hint: string }> = {
  Yazılım: {
    title: 'Örn. React tabanlı müşteri paneli geliştirme',
    description: 'Kullanıcı akışlarını, teknik altyapıyı, gerekli entegrasyonları, teslimatları ve kabul kriterlerini anlat.',
    skills: 'React, TypeScript, Next.js, Supabase (virgülle ayır)',
    hint: 'Teknoloji tercihini, hedef platformu, entegrasyonları ve beklenen teslimatları belirt.',
  },
  Tasarım: {
    title: 'Örn. Mobil uygulamamız için UI/UX tasarımı',
    description: 'Tasarlanacak ekranları, hedef kitleyi, marka stilini, teslim formatını ve varsa referansları anlat.',
    skills: 'Figma, UI/UX, Prototipleme, Design System (virgülle ayır)',
    hint: 'Ekran sayısını, platformu, marka dosyalarını ve teslim formatını belirt.',
  },
  Pazarlama: {
    title: 'Örn. Yeni ürünümüz için dijital pazarlama kampanyası',
    description: 'Hedef kitleyi, kampanya hedefini, kullanılacak kanalları, bütçeyi ve başarı ölçütlerini anlat.',
    skills: 'Google Ads, Meta Ads, SEO, Analitik (virgülle ayır)',
    hint: 'Kampanya hedefini, hedef kitleyi, kanalları ve ölçülecek sonuçları belirt.',
  },
  İçerik: {
    title: 'Örn. Teknoloji blogumuz için 10 SEO uyumlu içerik',
    description: 'İçerik türünü, konu başlıklarını, hedef kitleyi, tonu, kelime aralığını ve teslim sayısını anlat.',
    skills: 'İçerik Yazarlığı, SEO, Editörlük, Araştırma (virgülle ayır)',
    hint: 'İçerik adedini, uzunluğunu, yayın dilini, tonu ve anahtar kelimeleri belirt.',
  },
  'Video & Ses': {
    title: 'Örn. Markamız için 30 saniyelik tanıtım videosu',
    description: 'Videonun süresini, kullanılacağı platformu, formatı, kurgu stilini, ses ihtiyacını ve teslimatları anlat.',
    skills: 'Premiere Pro, After Effects, Kurgu, Ses Tasarımı (virgülle ayır)',
    hint: 'Süreyi, çözünürlüğü, platformu, ham görüntü durumunu ve revizyon beklentini belirt.',
  },
  Danışmanlık: {
    title: 'Örn. E-ticaret büyüme stratejisi danışmanlığı',
    description: 'Mevcut durumu, çözülmesini istediğin problemi, hedeflerini, çalışma kapsamını ve beklenen çıktıları anlat.',
    skills: 'Strateji, E-ticaret, Veri Analizi, Pazar Araştırması (virgülle ayır)',
    hint: 'Mevcut durumu, hedefi, beklenen çıktıyı ve çalışma biçimini belirt.',
  },
}

const defaultContent = {
  title: 'Örn. Projen için kısa ve anlaşılır bir başlık',
  description: 'Önce bir kategori seç; ardından ihtiyacı, teslimatları, hedef kitleyi ve varsa referansları anlat.',
  skills: 'Önce kategori seç (becerileri virgülle ayır)',
  hint: 'Kategori seçtiğinde ilanını hazırlamana yardımcı olacak bilgiler burada gösterilir.',
}

export function JobProjectFields() {
  const [category, setCategory] = useState<Category | ''>('')
  const content = category ? fieldContent[category] : defaultContent

  return <>
    <label>İlan başlığı<input name="title" required minLength={5} maxLength={140} placeholder={content.title} /></label>
    <label>
      Açıklama
      <textarea name="description" required minLength={20} rows={8} placeholder={content.description} />
      <small className="field-guidance" aria-live="polite">{content.hint}</small>
    </label>
    <div className="form-grid two">
      <label>Kategori<select name="category" required value={category} onChange={(event) => setCategory(event.target.value as Category | '')}><option value="" disabled>Seç</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Gerekli beceriler<input name="skills" placeholder={content.skills} /></label>
    </div>
  </>
}
