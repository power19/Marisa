import { useTranslations } from 'next-intl'
import ListingCard from './ListingCard'
import type { Listing } from '@/types/listing'

interface ListingGridProps {
  listings: Listing[]
  emptyMessage?: string
}

export default function ListingGrid({ listings, emptyMessage }: ListingGridProps) {
  const t = useTranslations('search')

  if (listings.length === 0) {
    return (
      <div className="py-16 text-center text-grey-medium">
        <p>{emptyMessage ?? t('noResults')}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}
