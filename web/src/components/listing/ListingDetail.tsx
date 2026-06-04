import dynamic from 'next/dynamic'
import { getTranslations } from 'next-intl/server'
import type { Listing } from '@/types/listing'
import type { Agent } from '@/types/agent'
import ListingGallery from './ListingGallery'
import AgentCard from './AgentCard'
import ContactActions from './ContactActions'
import PriceDisplay from './PriceDisplay'
import StatusBadge from './StatusBadge'

const ListingMap = dynamic(() => import('@/components/map/ListingMap'), { ssr: false })

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? ''

/** Convert a YouTube or Vimeo share URL to its embed URL */
function getEmbedUrl(url: string): string {
  // YouTube: youtu.be/ID  or  youtube.com/watch?v=ID
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`
  // Vimeo: vimeo.com/ID
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`
  // Already an embed URL or unknown — use as-is
  return url
}

interface ListingDetailProps {
  listing: Listing
  agent: Agent | null
  locale: string
}

export default async function ListingDetail({ listing, agent, locale }: ListingDetailProps) {
  const t = await getTranslations({ locale, namespace: 'listing' })
  const tc = await getTranslations({ locale, namespace: 'condition' })
  const tf = await getTranslations({ locale, namespace: 'furnished' })

  const translation = listing.translations?.find((tr) => tr.languages_code === locale)
    ?? listing.translations?.[0]

  const title = translation?.title ?? ''
  const description = translation?.description ?? ''

  const brochure = listing.media?.find((m) => m.kind === 'brochure_pdf')

  return (
    <div className="container-site py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-grey-medium mb-6 flex items-center gap-2">
        <span>{listing.location_id?.district ?? 'Suriname'}</span>
        <span>/</span>
        <span className="text-black">{title}</span>
      </nav>

      {/* ── Top section: Gallery (left) + Contact + Agent (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Gallery */}
        <div className="lg:col-span-2">
          <ListingGallery media={listing.media ?? []} title={title} />
        </div>

        {/* Right: Contact buttons + Agent card */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 flex flex-col gap-4">
            {/* Title + price — visible on mobile above the buttons */}
            <div className="lg:hidden">
              <div className="flex items-center gap-3 mb-1">
                <StatusBadge status={listing.status} />
                <span className="text-xs tracking-wider uppercase text-grey-medium">
                  {listing.offer_type === 'sale' ? 'For Sale' : 'For Rent'}
                </span>
              </div>
              <h1 className="text-h2 font-display mb-1">{title}</h1>
              {(listing.location_id || listing.address) && (
                <p className="text-sm text-grey-medium mb-1">
                  {[
                    listing.address,
                    listing.location_id?.sub_area,
                    listing.location_id?.district,
                  ].filter(Boolean).join(', ')}
                </p>
              )}
              <PriceDisplay
                amount={listing.price_amount}
                currency={listing.price_currency}
                priceOnRequest={listing.price_on_request}
                perMonth={listing.offer_type === 'rent'}
                className="text-price"
              />
            </div>

            {/* Contact + Viewing buttons → opens modal */}
            <ContactActions listingId={listing.id} listingSlug={listing.slug} />

            {/* Agent card */}
            {agent && <AgentCard agent={agent} listingRef={listing.slug} />}
          </div>
        </div>
      </div>

      {/* ── Details section (full width below) ── */}

      {/* Title + Status — desktop only */}
      <div className="hidden lg:block mb-6">
        <div className="flex items-center gap-3 mb-2">
          <StatusBadge status={listing.status} />
          <span className="text-xs tracking-wider uppercase text-grey-medium">
            {listing.offer_type === 'sale' ? 'For Sale' : 'For Rent'}
          </span>
        </div>
        <h1 className="text-h1 font-display mb-2">{title}</h1>
        {(listing.location_id || listing.address) && (
          <p className="text-grey-medium">
            {[
              listing.address,
              listing.location_id?.sub_area,
              listing.location_id?.district,
            ].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      {/* Price — desktop */}
      <div className="hidden lg:block mb-6">
        <PriceDisplay
          amount={listing.price_amount}
          currency={listing.price_currency}
          priceOnRequest={listing.price_on_request}
          perMonth={listing.offer_type === 'rent'}
          className="text-price"
        />
      </div>

      {/* Key attributes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-grey-light py-5 mb-6">
        {listing.bedrooms !== null && (
          <div>
            <p className="text-xs tracking-wider uppercase text-grey-medium mb-1">{t('bedrooms')}</p>
            <p className="text-h3 font-display">{listing.bedrooms}</p>
          </div>
        )}
        {listing.bathrooms !== null && (
          <div>
            <p className="text-xs tracking-wider uppercase text-grey-medium mb-1">{t('bathrooms')}</p>
            <p className="text-h3 font-display">{listing.bathrooms}</p>
          </div>
        )}
        {listing.build_area_m2 !== null && (
          <div>
            <p className="text-xs tracking-wider uppercase text-grey-medium mb-1">{t('buildArea')}</p>
            <p className="text-h3 font-display">{listing.build_area_m2} {t('sqm')}</p>
          </div>
        )}
        {listing.lot_area_m2 !== null && (
          <div>
            <p className="text-xs tracking-wider uppercase text-grey-medium mb-1">{t('lotArea')}</p>
            <p className="text-h3 font-display">{listing.lot_area_m2} {t('sqm')}</p>
          </div>
        )}
      </div>

      {/* Description */}
      {description && (
        <div className="mb-6">
          <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal">{description}</p>
        </div>
      )}

      {/* Additional details */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
        {listing.year_built && (
          <div className="flex justify-between border-b border-grey-light pb-2">
            <span className="text-grey-medium">{t('yearBuilt')}</span>
            <span>{listing.year_built}</span>
          </div>
        )}
        {listing.condition && (
          <div className="flex justify-between border-b border-grey-light pb-2">
            <span className="text-grey-medium">{t('condition')}</span>
            <span>{tc(listing.condition)}</span>
          </div>
        )}
        {listing.furnished && (
          <div className="flex justify-between border-b border-grey-light pb-2">
            <span className="text-grey-medium">Furnished</span>
            <span>{tf(listing.furnished)}</span>
          </div>
        )}
      </div>

      {/* Amenities */}
      {listing.amenities && listing.amenities.length > 0 && (
        <div className="mb-6">
          <h3 className="text-h3 font-display mb-3">{t('amenities')}</h3>
          <div className="flex flex-wrap gap-2">
            {listing.amenities.map((a) => {
              const label = a.amenities_id.icon ?? String(a.amenities_id.name ?? '')
              return (
                <span key={a.id} className="bg-grey-light text-xs px-3 py-1 rounded-sm">
                  {label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Embedded video player */}
      {listing.video_url && (
        <div className="mb-6">
          <h3 className="text-h3 font-display mb-3">{t('videoTour')}</h3>
          <div className="relative aspect-video rounded-md overflow-hidden bg-black">
            <iframe
              src={getEmbedUrl(listing.video_url)}
              title={t('videoTour')}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      )}

      {/* Downloads / Virtual tour */}
      <div className="flex flex-wrap gap-3 mb-6">
        {brochure && (
          <a
            href={`${DIRECTUS_URL}/assets/${brochure.file}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost text-sm"
          >
            {t('downloadBrochure')}
          </a>
        )}
        {listing.tour_url && (
          <a
            href={listing.tour_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost text-sm"
          >
            {t('virtualTour')}
          </a>
        )}
      </div>

      {/* Map */}
      {listing.lat !== null && listing.lng !== null && (
        <div className="mb-6">
          <h3 className="text-h3 font-display mb-3">Location</h3>
          <ListingMap lat={listing.lat} lng={listing.lng} title={title} />
        </div>
      )}
    </div>
  )
}
