'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo } from 'react'
import type { Location } from '@/types/listing'

const PROPERTY_TYPES = ['residential', 'land', 'commercial', 'apartment', 'vacation', 'expat'] as const
const FURNISHED_OPTIONS = ['furnished', 'unfurnished', 'partially'] as const

interface FilterPanelProps {
  locations: Location[]
}

export default function FilterPanel({ locations }: FilterPanelProps) {
  const t = useTranslations('search')
  const tp = useTranslations('propertyTypes')
  const tf = useTranslations('furnished')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams]
  )

  function handleReset() {
    router.push(pathname)
  }

  const currentOfferType = searchParams.get('offer_type') ?? ''
  const currentPropertyType = searchParams.get('property_type') ?? ''
  const currentDistrict = searchParams.get('district') ?? ''
  const currentLocationId = searchParams.get('location_id') ?? ''
  const currentBedrooms = searchParams.get('bedrooms') ?? ''
  const currentFurnished = searchParams.get('furnished') ?? ''
  const currentMinPrice = searchParams.get('min_price') ?? ''
  const currentMaxPrice = searchParams.get('max_price') ?? ''
  const currentMinArea = searchParams.get('min_area') ?? ''
  const currentMaxArea = searchParams.get('max_area') ?? ''
  const currentKeyword = searchParams.get('keyword') ?? ''

  // Group locations: unique districts + sub-areas per district
  const districts = useMemo(
    () => Array.from(new Set(locations.map((l) => l.district))).sort(),
    [locations]
  )

  const subAreas = useMemo(
    () =>
      currentDistrict
        ? locations
            .filter((l) => l.district === currentDistrict && l.sub_area)
            .sort((a, b) => (a.sub_area ?? '').localeCompare(b.sub_area ?? ''))
        : [],
    [locations, currentDistrict]
  )

  function handleDistrictChange(district: string) {
    // Clear location_id (sub-area) when district changes
    updateParam({ district, location_id: '' })
  }

  function handleSubAreaChange(locationId: string) {
    updateParam({ location_id: locationId })
  }

  return (
    <aside className="bg-white border border-grey-light rounded-md p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wider uppercase">{t('filters')}</h2>
        <button
          onClick={handleReset}
          className="text-xs text-grey-medium hover:text-black transition-colors"
        >
          {t('reset')}
        </button>
      </div>

      {/* Offer type */}
      <div>
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-2">
          {t('offerType')}
        </label>
        <div className="flex gap-2">
          {(['', 'sale', 'rent'] as const).map((v) => (
            <button
              key={v}
              onClick={() => updateParam({ offer_type: v })}
              className={`flex-1 py-1 text-xs border rounded-sm transition-colors ${
                currentOfferType === v
                  ? 'bg-blue text-white border-blue'
                  : 'border-grey-light text-grey-medium hover:border-blue hover:text-blue'
              }`}
            >
              {v === '' ? t('all') : v === 'sale' ? t('sale') : t('rent')}
            </button>
          ))}
        </div>
      </div>

      {/* Property type */}
      <div>
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-2">
          {t('propertyType')}
        </label>
        <select
          value={currentPropertyType}
          onChange={(e) => updateParam({ property_type: e.target.value })}
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
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-2">
          {t('district')}
        </label>
        <select
          value={currentDistrict}
          onChange={(e) => handleDistrictChange(e.target.value)}
          className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue bg-white"
        >
          <option value="">{t('allDistricts')}</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Sub-area / Neighbourhood — only shown when a district with sub-areas is selected */}
      {subAreas.length > 0 && (
        <div>
          <label className="block text-xs tracking-wider uppercase text-grey-medium mb-2">
            {t('neighbourhood')}
          </label>
          <select
            value={currentLocationId}
            onChange={(e) => handleSubAreaChange(e.target.value)}
            className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue bg-white"
          >
            <option value="">{t('allNeighbourhoods')}</option>
            {subAreas.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.sub_area}</option>
            ))}
          </select>
        </div>
      )}

      {/* Price range */}
      <div>
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-2">
          {t('priceRange')}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder={t('minPrice')}
            value={currentMinPrice}
            onChange={(e) => updateParam({ min_price: e.target.value })}
            className="flex-1 border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue w-0"
          />
          <input
            type="number"
            placeholder={t('maxPrice')}
            value={currentMaxPrice}
            onChange={(e) => updateParam({ max_price: e.target.value })}
            className="flex-1 border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue w-0"
          />
        </div>
      </div>

      {/* Bedrooms */}
      <div>
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-2">
          {t('bedrooms')}
        </label>
        <div className="flex gap-1">
          {(['', '1', '2', '3', '4', '5'] as const).map((v) => (
            <button
              key={v}
              onClick={() => updateParam({ bedrooms: v })}
              className={`flex-1 py-1 text-xs border rounded-sm transition-colors ${
                currentBedrooms === v
                  ? 'bg-blue text-white border-blue'
                  : 'border-grey-light text-grey-medium hover:border-blue hover:text-blue'
              }`}
            >
              {v === '' ? t('anyBedrooms') : v === '5' ? '5+' : v}
            </button>
          ))}
        </div>
      </div>

      {/* Furnished */}
      <div>
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-2">
          {t('furnished')}
        </label>
        <select
          value={currentFurnished}
          onChange={(e) => updateParam({ furnished: e.target.value })}
          className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue bg-white"
        >
          <option value="">{t('any')}</option>
          {FURNISHED_OPTIONS.map((fo) => (
            <option key={fo} value={fo}>{tf(fo)}</option>
          ))}
        </select>
      </div>

      {/* Area range */}
      <div>
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-2">
          {t('area')}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder={t('minArea')}
            value={currentMinArea}
            onChange={(e) => updateParam({ min_area: e.target.value })}
            className="flex-1 border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue w-0"
          />
          <input
            type="number"
            placeholder={t('maxArea')}
            value={currentMaxArea}
            onChange={(e) => updateParam({ max_area: e.target.value })}
            className="flex-1 border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue w-0"
          />
        </div>
      </div>

      {/* Keyword */}
      <div>
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-2">
          {t('keyword')}
        </label>
        <input
          type="text"
          value={currentKeyword}
          onChange={(e) => updateParam({ keyword: e.target.value })}
          className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue"
          placeholder="..."
        />
      </div>
    </aside>
  )
}
