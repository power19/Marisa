import { useTranslations } from 'next-intl'
import { formatPrice } from '@/lib/utils/currency'
import type { Currency } from '@/types/listing'

interface PriceDisplayProps {
  amount: number | null
  currency: Currency
  priceOnRequest: boolean
  perMonth?: boolean
  className?: string
}

export default function PriceDisplay({
  amount,
  currency,
  priceOnRequest,
  perMonth = false,
  className = '',
}: PriceDisplayProps) {
  const t = useTranslations()

  const formatted = formatPrice(amount, currency, priceOnRequest, (key) => t(key))

  return (
    <span className={`text-price font-display ${className}`}>
      {formatted}
      {!priceOnRequest && amount !== null && perMonth && (
        <span className="text-sm font-body text-grey-medium ml-1">
          {t('listing.perMonth')}
        </span>
      )}
    </span>
  )
}
