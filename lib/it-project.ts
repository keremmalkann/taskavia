export const categories = ['Sistem Yönetimi', 'Ağ & Firewall', 'Siber Güvenlik', 'Bulut & Microsoft 365', 'Yedekleme & Kurtarma', 'İzleme & Otomasyon'] as const
export const legacyCategories = ['Yazılım', 'Tasarım', 'Pazarlama', 'İçerik', 'Video & Ses', 'Danışmanlık'] as const
export const workModes = ['Uzaktan', 'Yerinde', 'Hibrit'] as const
export const projectGuidance = {
  'Sistem Yönetimi': { title: 'Windows Server ve Active Directory geçişi', skills: 'Windows Server, Linux, Active Directory, VMware', hint: 'Sunucu rolleri, sürümler, bağımlılıklar ve geçiş sonrası kontrolleri belirt.' },
  'Ağ & Firewall': { title: 'İki şube arasında VPN ve VLAN yapılandırması', skills: 'Fortinet, Cisco, VPN, VLAN', hint: 'Şube sayısı, cihaz modelleri, bağlantı ihtiyacı ve kabul testlerini belirt. Açık IP veya erişim bilgisi paylaşma.' },
  'Siber Güvenlik': { title: 'Sunucular için güvenlik sıkılaştırma incelemesi', skills: 'Hardening, SIEM, EDR, IAM', hint: 'Yetkili inceleme kapsamını, kapsam dışı sistemleri ve beklenen raporu belirt. Yazılı izin olmadan tarama veya müdahale yapılmamalı.' },
  'Bulut & Microsoft 365': { title: 'Microsoft 365 geçişi ve kimlik yapılandırması', skills: 'Microsoft 365, Entra ID, Azure, AWS', hint: 'Mevcut hizmetleri, lisansları, kullanıcı sayısını ve taşınacak iş yüklerini belirt.' },
  'Yedekleme & Kurtarma': { title: 'Veeam yedekleme ve geri dönüş testi', skills: 'Veeam, Backup, Disaster Recovery', hint: 'Veri hacmini, saklama süresini, kabul edilebilir veri kaybını ve geri dönüş süresini belirt.' },
  'İzleme & Otomasyon': { title: 'Zabbix izleme ve alarm kurallarının kurulumu', skills: 'Zabbix, Grafana, PowerShell, Ansible', hint: 'İzlenecek sistemleri, alarm koşullarını ve otomasyonun çalışma sınırlarını belirt.' },
} satisfies Record<(typeof categories)[number], { title: string; skills: string; hint: string }>

export function prepareITDescription(form: FormData): { description: string; error?: never } | { error: string; description?: never } {
  const read = (key: string) => String(form.get(key) ?? '').trim()
  if (!categories.some((item) => item === read('category'))) return { error: 'Geçerli bir teknik kategori seç.' }
  const description = read('description'), environment = read('environment'), scale = read('scopeSize'), mode = read('workMode'), location = read('location'), maintenance = read('maintenanceWindow'), acceptance = read('acceptanceCriteria')
  if (description.length < 20 || description.length > 2500 || environment.length < 5 || environment.length > 600 || !scale || scale.length > 120 || maintenance.length < 3 || maintenance.length > 200 || acceptance.length < 10 || acceptance.length > 800) return { error: 'Açıklama, altyapı, ölçek, çalışma zamanı ve teslim kriterlerini kontrol et.' }
  if (!workModes.some((item) => item === mode) || (mode !== 'Uzaktan' && !location) || location.length > 120) return { error: 'Çalışma şeklini ve yerinde çalışma için şehir/ilçe bilgisini belirt.' }
  if (form.get('authorized') !== 'on') return { error: 'Sistemler üzerinde çalışma talep etmeye yetkili olduğunu onaylamalısın.' }
  if (read('category') === 'Siber Güvenlik' && form.get('securityScope') !== 'on') return { error: 'Güvenlik çalışması öncesinde yazılı kapsam ve yetkilendirme gerekliliğini onayla.' }
  // Keep existing jobs untouched. Technical requirements are persisted together
  // with the description, so every existing detail/proposal view can read them.
  const combined = `${description}\n\nTEKNİK KAPSAM\nMevcut altyapı: ${environment}\nCihaz / kullanıcı / şube ölçeği: ${scale}\nÇalışma şekli: ${mode}${mode !== 'Uzaktan' ? `\nKonum: ${location}` : ''}\nBakım / çalışma zamanı: ${maintenance}\n\nTESLİM VE KABUL KRİTERLERİ\n${acceptance}\n\nYETKİLENDİRME\nİlan sahibi çalışma talep etme yetkisini beyan etti.${read('category') === 'Siber Güvenlik' ? ' Güvenlik çalışması başlamadan yazılı kapsam ve izin taraflarca netleştirilmelidir.' : ''}`
  if (combined.length > 5000) return { error: 'Toplam proje kapsamı çok uzun. Metinleri biraz kısalt.' }
  return { description: combined }
}
