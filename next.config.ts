import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  experimental: {
    // proxy.ts varlığında gövde belleğe kopyalanır; varsayılan 10 MB sınırı
    // 10 MB'a kadar portföy yüklemelerini (multipart ek yüküyle) kesebilir.
    proxyClientMaxBodySize: '12mb',
  },
  images: {
    remotePatterns: supabaseUrl
      ? [{ protocol: "https", hostname: new URL(supabaseUrl).hostname, pathname: "/storage/v1/object/public/portfolios/**" }]
      : [],
  },
};

export default nextConfig;
