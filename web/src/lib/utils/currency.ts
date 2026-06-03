type TranslationFn = (key: string) => string

export function formatPrice(
  amount: number | null,
  currency: string,
  price_on_request: boolean,
  t: TranslationFn
): string {
  if (price_on_request || amount === null) {
    return t('listing.priceOnRequest')
  }

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (currency === 'EUR') {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // SRD — no Intl support, format manually
  return `SRD ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`
}
