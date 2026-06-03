'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'

const DISTRICTS = [
  'Paramaribo', 'Wanica', 'Para', 'Commewijne', 'Nickerie',
  'Saramacca', 'Coronie', 'Marowijne', 'Sipaliwini', 'Brokopondo',
]

const PROPERTY_TYPES = ['residential', 'land', 'commercial', 'apartment', 'vacation', 'expat'] as const

export default function SearchWidget() {
  const t = useTranslations('search')
  const tp = useTranslations('propertyTypes')
  const locale = useLocale()
  const router = useRouter()

  const [offerType, setOfferType] = useState<'sale' | 'rent'>('sale')
  const [propertyType, setPropertyType] = useState('')
  const [district, setDistrict] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [keyword, setKeyword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('offer_type', offerType)
    if (propertyType) params.set('property_type', propertyType)
    if (district) params.set('district', district)
    if (minPrice) params.set('min_price', minPrice)
    if (maxPrice) params.set('max_price', maxPrice)
    if (keyword) params.set('keyword', keyword)
    router.push(`/${locale}/search?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-overlay rounded-md p-6">
      {/* Offer type tabs */}
      <div className="flex gap-1 mb-5 border-b border-grey-light">
        {(['sale', 'rent'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setOfferType(type)}
            className={`px-6 py-2 text-sm font-semibold tracking-wider uppercase transition-colors -mb-px ${
              offerType === type
                ? 'border-b-2 border-blue text-blue'
                : 'text-grey-medium hover:text-black'
            }`}
          >
            {type === 'sale' ? t('buy') : t('rent')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Property type */}
        <div>
          <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
            {t('propertyType')}
          </label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue bg-white"
          >
            <option value="">{t('allTypes')}</option>
            {PROPERTY_TYPES.map((pt) => (
              <option key={pt} value={pt}>{tp(pt)}</option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
            {t('district')}
          </label>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue bg-white"
          >
            <option value="">{t('allDistricts')}</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Price range */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
              {t('minPrice')}
            </label>
            <input
              type="number"
              placeholder="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
              {t('maxPrice')}
            </label>
            <input
              type="number"
              placeholder="∞"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue"
            />
          </div>
        </div>

        {/* Keyword */}
        <div>
          <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
            {t('keyword')}
          </label>
          <input
            type="text"
            placeholder="..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue"
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary w-full sm:w-auto">
        {t('filters')}
      </button>
    </form>
  )
}
