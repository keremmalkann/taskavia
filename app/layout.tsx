import type { Metadata } from "next";
import "./globals.css";
import "./accordions.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "İşlik — İyi işlerin buluşma noktası",
  description: "Türkiye'nin seçkin freelancer ve işverenlerini güvenli projelerde buluşturan yaratıcı iş ağı.",
  openGraph: {
    title: "İşlik — İyi işlerin buluşma noktası",
    description: "İyi iş, doğru yetenekle başlar.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "İşlik freelancer pazaryeri" }],
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "İşlik — İyi işlerin buluşma noktası",
    description: "İyi iş, doğru yetenekle başlar.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="tr"><body>{children}</body></html>;
}
