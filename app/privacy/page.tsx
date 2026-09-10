import type { Metadata } from 'next'
import { LegalPage } from '@/app/legal-page'

export const metadata: Metadata = { title: 'Gizlilik ve KVKK Aydınlatması — Taskavia', description: 'Taskavia kişisel veri işleme ve gizlilik bilgilendirmesi.' }

const sections = [
  { title: 'Veri sorumlusu', content: <><p>Taskavia hizmetini işleten gerçek veya tüzel kişi, platformdaki kişisel verilerin işleme amaçlarını ve yöntemlerini belirlediği ölçüde veri sorumlusudur. İşletmecinin ticari unvanı, adresi ve başvuru kanalı canlı hizmete geçişten önce bu metinde tamamlanacaktır.</p></> },
  { title: 'İşlenen veriler', content: <><p>Kimlik ve iletişim bilgileri, hesap rolü, profil ve portföy içerikleri, ilanlar, teklifler, değerlendirmeler, mesajlar, güvenlik ve oturum kayıtları ile kullanıcı tercihleri işlenebilir. Özgeçmiş ve portföy dosyaları kullanıcı tarafından isteğe bağlı olarak yüklenir.</p></> },
  { title: 'İşleme amaçları', content: <><p>Veriler; hesap oluşturmak, kimlik doğrulamak, ilan ve teklif akışını yürütmek, tarafların iletişimini sağlamak, güvenliği korumak, kötüye kullanımı önlemek, destek taleplerini yanıtlamak ve yasal yükümlülükleri yerine getirmek amacıyla kullanılır.</p></> },
  { title: 'Hukuki sebepler ve toplama yöntemi', content: <><p>Veriler elektronik ortamda, kullanıcı tarafından girilerek veya hizmet kullanımı sırasında otomatik yollarla toplanır. İşleme; sözleşmenin kurulması ve ifası, hukuki yükümlülük, hakkın tesisi veya korunması, meşru menfaat ve gerekli olduğunda açık rıza sebeplerine dayanabilir.</p></> },
  { title: 'Aktarım ve hizmet sağlayıcılar', content: <><p>Veriler, barındırma, veritabanı, kimlik doğrulama, e-posta ve güvenlik hizmeti sağlayıcılarıyla yalnızca hizmetin gerektirdiği ölçüde paylaşılabilir. Yetkili kamu kurumlarına aktarım ancak hukuki yükümlülük veya geçerli bir talep kapsamında yapılır.</p></> },
  { title: 'Saklama ve güvenlik', content: <><p>Veriler işleme amacı sürdüğü ve yasal saklama süreleri gerektirdiği müddetçe tutulur; ardından silinir, yok edilir veya anonimleştirilir. Erişim kontrolü, satır düzeyi yetkilendirme, özel dosya alanları ve oturum güvenliği gibi teknik tedbirler uygulanır.</p></> },
  { title: 'Profil görünürlüğü', content: <><p>Kullanıcılar Ayarlar ekranından profil görünürlüğünü, aktivite ve tamamlanan işlerin gösterimini yönetebilir. Herkese açık profiller internet üzerinden görüntülenebilir; üyelere açık profiller yalnızca oturum açmış kullanıcılara sunulur.</p></> },
  { title: 'İlgili kişi hakları', content: <><p>Kullanıcı; verilerinin işlenip işlenmediğini öğrenme, bilgi talep etme, amacına uygun kullanımı öğrenme, aktarılan üçüncü kişileri bilme, düzeltme veya silme isteme ve kanundaki diğer haklarını kullanma hakkına sahiptir. Hesap silme işlemi Ayarlar ekranından başlatılabilir; diğer başvuru kanalları canlı hizmet öncesi ilan edilir.</p></> },
]

export default function PrivacyPage() {
  return <LegalPage eyebrow="GİZLİLİK" title="KVKK aydınlatması" summary="Kişisel verilerin hangi kapsamda işlendiğini ve kullanıcıların seçimlerini açıklar." sections={sections} />
}
