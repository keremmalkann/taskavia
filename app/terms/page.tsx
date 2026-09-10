import type { Metadata } from 'next'
import { LegalPage } from '@/app/legal-page'

export const metadata: Metadata = { title: 'Kullanım Koşulları — Taskavia', description: 'Taskavia platformunun kullanım koşulları.' }

const sections = [
  { title: 'Platformun kapsamı', content: <><p>Taskavia, işverenlerin proje ilanı yayımlamasına ve freelancerların bu ilanlara teklif vermesine aracılık eden bir dijital platformdur. Taskavia işin tarafı, işveren veya freelancer değildir; kullanıcılar arasındaki sözleşmenin şartları ilgili kullanıcılar tarafından belirlenir.</p></> },
  { title: 'Hesap ve güvenlik', content: <><p>Kayıt sırasında doğru ve güncel bilgi verilmesi, giriş bilgilerinin korunması ve hesap üzerinden yapılan işlemlerin takip edilmesi kullanıcının sorumluluğundadır. Yetkisiz kullanım şüphesi oluştuğunda parola yenilenmeli ve aktif oturumlar sonlandırılmalıdır.</p></> },
  { title: 'İlanlar ve teklifler', content: <><p>İlan ve teklif içerikleri hukuka, üçüncü kişi haklarına ve platform güvenliğine uygun olmalıdır. Yanıltıcı bilgi, hukuka aykırı hizmet, zararlı yazılım, kimlik avı veya platform dışı dolandırıcılık amacı taşıyan içerikler kaldırılabilir; ilgili hesaplar sınırlandırılabilir.</p></> },
  { title: 'İşin yürütülmesi', content: <><p>Taraflar kapsamı, teslim tarihini, bedeli ve kabul ölçütlerini işe başlamadan önce yazılı olarak netleştirmelidir. Mesajlar ve proje özeti uyuşmazlıkların değerlendirilmesinde bağlam sağlar; tek başına resmi sözleşme veya ödeme belgesi yerine geçmez.</p></> },
  { title: 'Ödeme özelliği', content: <><p>Platformdaki ödeme altyapısı şu anda kullanıma açık değildir. İşveren ve freelancer, ödeme ve faturalandırma yükümlülüklerini kendi aralarında ve yürürlükteki mevzuata uygun biçimde yönetir. Ödeme özelliği etkinleştirildiğinde ek koşullar ayrıca yayımlanacaktır.</p></> },
  { title: 'Fikri mülkiyet', content: <><p>Kullanıcı, yüklediği içerik üzerinde gerekli haklara sahip olduğunu kabul eder. İş sonucundaki fikri mülkiyet devri, tarafların ayrıca belirlediği şartlara tabidir. Taskavia markası, arayüzü ve platform yazılımı izin verilmedikçe kopyalanamaz.</p></> },
  { title: 'Hesabın askıya alınması ve silinmesi', content: <><p>Güvenlik ihlali, hukuka aykırı kullanım veya diğer kullanıcıların zarar görme riski halinde hesap ya da içerik geçici olarak sınırlandırılabilir. Kullanıcı, Ayarlar ekranından hesabını silebilir; hukuki saklama zorunlulukları dışında hesapla ilişkili veriler silme akışına göre kaldırılır.</p></> },
  { title: 'Değişiklikler ve iletişim', content: <><p>Koşullar ürün veya mevzuat değişikliklerine göre güncellenebilir. Önemli değişiklikler platform içinde duyurulur. Ticari unvan, tebligat adresi ve resmi iletişim kanalı canlı hizmete geçişten önce bu alanda yayımlanacaktır.</p></> },
]

export default function TermsPage() {
  return <LegalPage eyebrow="PLATFORM KURALLARI" title="Kullanım koşulları" summary="Taskavia’yı kullanırken kullanıcıların ve platformun sorumluluklarını açıklar." sections={sections} />
}
