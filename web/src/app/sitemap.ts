import type { MetadataRoute } from 'next'
import { getAllPublishedSlugs } from '@/lib/directus/listings'
import { locales } from '@/lib/i18n/config'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fareastproperties.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  // Static pages
  const staticPaths = ['', '/search', '/buying', '/selling', '/renting', '/expat', '/about', '/contact', '/privacy']

  for (const locale of locales) {
    for (const path of staticPaths) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : 0.8,
      })
    }
  }

  // Listing detail pages
  let slugs: string[] = []
  try {
    slugs = await getAllPublishedSlugs()
  } catch {
    // non-fatal — sitemap will just omit listings
  }

  for (const slug of slugs) {
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}/listings/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      })
    }
  }

  return entries
}
