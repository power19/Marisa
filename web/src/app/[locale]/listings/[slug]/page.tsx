import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getListing } from '@/lib/directus/listings'
import { getAgents } from '@/lib/directus/agents'
import ListingDetail from '@/components/listing/ListingDetail'
import type { Agent } from '@/types/agent'

export const revalidate = 3600

interface PageProps {
  params: { locale: string; slug: string }
}

export function generateStaticParams() {
  // ISR on-demand: no static params at build time
  return []
}

export async function generateMetadata({ params: { locale, slug } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'meta' })
  const listing = await getListing(slug)
  if (!listing) return { title: 'Listing Not Found' }

  const translation = listing.translations?.find((tr) => tr.languages_code === locale)
    ?? listing.translations?.[0]

  const title = translation?.title ?? slug
  const description = translation?.description ?? t('listingDescription')

  const primaryPhoto = listing.media?.find(
    (m) => m.kind === 'photo' && m.is_primary
  ) ?? listing.media?.find((m) => m.kind === 'photo')

  const ogImage = primaryPhoto
    ? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${primaryPhoto.file}`
    : undefined

  return {
    title,
    description: description?.slice(0, 160) ?? t('listingDescription'),
    alternates: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      languages: {
        en: `/en/listings/${slug}`,
        nl: `/nl/listings/${slug}`,
        srn: `/srn/listings/${slug}`,
      } as any,
    },
    openGraph: {
      title,
      description: description?.slice(0, 160) ?? '',
      images: ogImage ? [ogImage] : [],
    },
  }
}

export default async function ListingPage({ params: { locale, slug } }: PageProps) {
  setRequestLocale(locale)
  const listing = await getListing(slug)
  if (!listing) notFound()

  // Find agent
  let agent: Agent | null = null
  if (listing.agent_id) {
    try {
      const agents = await getAgents()
      agent = agents.find((a) => a.user_id === listing.agent_id) ?? null
    } catch {
      // non-fatal
    }
  }

  const translation = listing.translations?.find((tr) => tr.languages_code === locale)
    ?? listing.translations?.[0]

  const title = translation?.title ?? slug
  const description = translation?.description ?? ''

  // Schema.org JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: title,
    description,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/listings/${slug}`,
    ...(listing.price_amount && !listing.price_on_request
      ? {
          offers: {
            '@type': 'Offer',
            price: listing.price_amount,
            priceCurrency: listing.price_currency,
          },
        }
      : {}),
    ...(listing.location_id
      ? {
          locationCreated: {
            '@type': 'Place',
            name: listing.location_id.district,
          },
        }
      : {}),
    ...(listing.lat && listing.lng
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: listing.lat,
            longitude: listing.lng,
          },
        }
      : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ListingDetail listing={listing} agent={agent} locale={locale} />
    </>
  )
}
