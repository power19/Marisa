import { useTranslations } from 'next-intl'
import type { ListingStatus } from '@/types/listing'

const statusClasses: Record<ListingStatus, string> = {
  new: 'badge badge-new',
  available: 'badge badge-available',
  reduced: 'badge badge-reduced',
  under_contract: 'badge badge-contract',
  sold: 'badge badge-sold',
  rented: 'badge badge-rented',
  price_on_request: 'badge badge-available',
}

interface StatusBadgeProps {
  status: ListingStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations('listingStatus')

  const labelKey = status === 'under_contract' ? 'under_contract' : status

  return (
    <span className={statusClasses[status]}>
      {t(labelKey)}
    </span>
  )
}
