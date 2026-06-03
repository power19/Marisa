import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import FilterPanel from '@/components/search/FilterPanel'
import { getLocations } from '@/lib/directus/locations'
import type { Location } from '@/types/listing'
import SortControl from '@/components/search/SortControl'
import ListingGrid from '@/components/listing/ListingGrid'
import { getListings } from '@/lib/directus/listings'
import type { SearchParams } from '@/types/listing'

interface PageProps {
  params: { locale: string }
  searchParams: Record<string, string | string[] | undefined>
}

function parseSearchParams(raw: Record<string, string | string[] | undefined>): SearchParams {
  const s = (key: string) => {
    const v = raw[key]
    return typeof v === 'string' ? v : undefined
  }
  const n = (key: string) => {
    const v = s(key)
    return v ? Number(v) : undefined
  }
  return {
    offer_type: s('offer_type') as SearchParams['offer_type'],
    property_type: s('property_type') as SearchParams['property_type'],
    location_id: s('location_id'),
    district: s('district'),
    keyword: s('keyword'),
    min_price: n('min_price'),
    max_price: n('max_price'),
    bedrooms: n('bedrooms'),
    furnished: s('furnished') as SearchParams['furnished'],
    min_area: n('min_area'),
    max_area: n('max_area'),
    sort: s('sort') as SearchParams['sort'],
    page: n('page') ?? 1,
    limit: 12,
  }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    title: t('searchTitle'),
    description: t('searchDescription'),
  }
}

const LIMIT = 12

export default async function SearchPage({ params: { locale }, searchParams: rawParams }: PageProps) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'search' })
  const params = parseSearchParams(rawParams)
  const page = params.page ?? 1

  let listings: Awaited<ReturnType<typeof getListings>>['data'] = []
  let total = 0
  let error = false
  let locations: Location[] = []

  // Fetch locations independently — never let a listings error blank the filter
  try { locations = await getLocations() } catch { /* leave empty */ }

  try {
    const result = await getListings({ ...params, page, limit: LIMIT })
    listings = result.data
    total = result.total
  } catch {
    error = true
  }

  const totalPages = Math.ceil(total / LIMIT)

  function buildPageUrl(p: number) {
    const sp = new URLSearchParams()
    Object.entries(rawParams).forEach(([k, v]) => {
      if (v && typeof v === 'string') sp.set(k, v)
    })
    sp.set('page', String(p))
    return `/${locale}/search?${sp.toString()}`
  }

  return (
    <div className="container-site py-8">
      <h1 className="text-h2 font-display mb-2">
        {t('results', { count: total })}
      </h1>
      <p className="text-sm text-grey-medium mb-6">
        {params.offer_type === 'sale'
          ? 'Properties for Sale'
          : params.offer_type === 'rent'
          ? 'Properties for Rent'
          : 'All Properties'}
      </p>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filter panel */}
        <div className="lg:w-64 flex-shrink-0">
          <Suspense fallback={null}>
            <FilterPanel locations={locations} />
          </Suspense>
        </div>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-grey-medium">
              {total} {total === 1 ? 'property' : 'properties'}
            </span>
            <Suspense fallback={null}>
              <SortControl />
            </Suspense>
          </div>

          {error ? (
            <p className="text-center py-12 text-grey-medium">
              Failed to load listings. Please try again.
            </p>
          ) : (
            <ListingGrid listings={listings} />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
              {page > 1 && (
                <Link href={buildPageUrl(page - 1)} className="btn btn-ghost text-sm px-4 py-2">
                  ← Prev
                </Link>
              )}
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildPageUrl(p)}
                  className={`w-9 h-9 flex items-center justify-center text-sm rounded-sm border transition-colors ${
                    p === page
                      ? 'bg-blue text-white border-blue'
                      : 'border-grey-light text-grey-medium hover:border-blue hover:text-blue'
                  }`}
                >
                  {p}
                </Link>
              ))}
              {page < totalPages && (
                <Link href={buildPageUrl(page + 1)} className="btn btn-ghost text-sm px-4 py-2">
                  Next →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
