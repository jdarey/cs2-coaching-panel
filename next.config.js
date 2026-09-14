/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    // tree-shake cięższych paczek: mniej JS w _next/static = mniej Vercel bandwidth
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'date-fns', '@tanstack/react-table'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'vumbnail.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.akamai.steamstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.akamai.steamstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.faceit.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.faceit-cdn.net',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    // Dłuższy cache zoptymalizowanych obrazów = mniej Vercel Image Optimization hits (limit free).
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        // DNS-prefetch dla YouTube (player ładuje się szybciej, mniej TTFB).
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

module.exports = nextConfig