import type { Metadata } from "next";
import "./globals.css";
import "./accordions.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Taskavia — Sistem, Ağ ve Güvenlik Uzmanları",
  description: "Sistem yönetimi, ağ, bulut ve siber güvenlik projeleri için şirketleri IT uzmanlarıyla buluşturan platform.",
  openGraph: {
    title: "Taskavia — Sistem, Ağ ve Güvenlik Uzmanları",
    description: "IT altyapın için doğru uzmanı bul.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Taskavia freelancer pazaryeri" }],
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Taskavia — Sistem, Ağ ve Güvenlik Uzmanları",
    description: "IT altyapın için doğru uzmanı bul.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="tr"><body>{children}</body></html>;
}
