import type { Metadata } from 'next'
import { LegalPage } from '@/app/legal-page'

export const metadata: Metadata = { title: 'Çerez Politikası — Taskavia', description: 'Taskavia çerez ve yerel depolama kullanımı hakkında bilgi.' }

const sections = [
  { title: 'Kapsam', content: <><p>Bu politika, Taskavia web uygulamasında tarayıcıya kaydedilen çerezleri ve benzer yerel depolama teknolojilerini açıklar.</p></> },
  { title: 'Zorunlu teknolojiler', content: <><p>Oturumun güvenli biçimde sürdürülmesi, kimlik doğrulama, güvenlik kontrolleri ve kullanıcının açıkça istediği temel işlevler için zorunlu çerezler kullanılabilir. Bunlar kapatıldığında giriş ve hesap özellikleri çalışmayabilir.</p></> },
  { title: 'Yerel tercihler', content: <><p>Mesaj okuma durumu gibi arayüz tercihleri, deneyimi cihazda sürdürebilmek için tarayıcı depolamasında tutulabilir. Bu bilgiler cihazdaki tarayıcı verileri temizlendiğinde kaldırılır.</p></> },
  { title: 'Analitik ve reklam', content: <><p>Taskavia şu anda reklam çerezi kullanmaz. Zorunlu olmayan analitik veya pazarlama teknolojileri ileride eklenirse, bunlar etkinleştirilmeden önce ayrı tercih ve bilgilendirme mekanizması sunulacaktır.</p></> },
  { title: 'Kontrol seçenekleri', content: <><p>Tarayıcı ayarlarından çerezleri görüntüleyebilir, silebilir veya engelleyebilirsin. Zorunlu çerezlerin engellenmesi platformun bazı bölümlerinin kullanılamamasına neden olabilir.</p></> },
]

export default function CookiesPage() {
  return <LegalPage eyebrow="ÇEREZLER" title="Çerez politikası" summary="Oturum ve ürün deneyimi için kullanılan tarayıcı teknolojilerini açıklar." sections={sections} />
}
