import Image from 'next/image'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import StatusBadge from './StatusBadge'
import PriceDisplay from './PriceDisplay'
import type { Listing } from '@/types/listing'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? ''

function getTitle(listing: Listing, locale: string): string {
  const t = listing.translations?.find((tr) => tr.languages_code === locale)
    ?? listing.translations?.[0]
  return t?.title ?? ''
}

function getPrimaryPhoto(listing: Listing): string | null {
  if (!listing.listing_media?.length) return null
  const primary = listing.listing_media.find((m) => m.kind === 'photo' && m.is_primary)
    ?? listing.listing_media.find((m) => m.kind === 'photo')
  return primary ? `${DIRECTUS_URL}/assets/${primary.file}` : null
}

interface ListingCardProps {
  listing: Listing
}

export default function ListingCard({ listing }: ListingCardProps) {
  const locale = useLocale()
  const t = useTranslations('listing')
  const title = getTitle(listing, locale)
  const photo = getPrimaryPhoto(listing)

  return (
    <Link
      href={`/${locale}/listings/${listing.slug}`}
      className="card block overflow-hidden group"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-grey-light overflow-hidden">
        {photo ? (
          <Image
            src={photo}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-grey-medium">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={listing.status} />
        </div>
        {/* Offer type pill */}
        <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-sm tracking-wider uppercase">
          {listing.offer_type === 'sale' ? 'Sale' : 'Rent'}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <PriceDisplay
          amount={listing.price_amount}
          currency={listing.price_currency}
          priceOnRequest={listing.price_on_request}
          perMonth={listing.offer_type === 'rent'}
          className="block mb-1"
        />

        {/* Title */}
        <h3 className="font-display text-h3 leading-snug mb-1 line-clamp-2">{title}</h3>

        {/* Location */}
        {listing.location_id && (
          <p className="text-sm text-grey-medium mb-3">
            {listing.location_id.sub_area
              ? `${listing.location_id.sub_area}, ${listing.location_id.district}`
              : listing.location_id.district}
          </p>
        )}

        {/* Attributes */}
        <div className="flex items-center gap-4 text-xs text-grey-medium pt-3 border-t border-grey-light">
          {listing.bedrooms !== null && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v13M3 7h18M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2M21 7v13M9 7v6m6-6v6" />
              </svg>
              {listing.bedrooms} {t('bedrooms')}
            </span>
          )}
          {listing.bathrooms !== null && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12h16M4 12V6a2 2 0 012-2h2M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6" />
              </svg>
              {listing.bathrooms} {t('bathrooms')}
            </span>
          )}
          {listing.build_area_m2 !== null && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              {listing.build_area_m2} {t('sqm')}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
