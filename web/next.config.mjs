import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    // Dev: images served directly from browser to Directus (bypasses Next.js
    // image optimization which can't reach localhost:8055 from inside Docker).
    // In production, R2 CDN URLs are always publicly reachable so this can be removed.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/assets/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/assets/**',
      },
    ],
  },
}

export default withNextIntl(nextConfig)
