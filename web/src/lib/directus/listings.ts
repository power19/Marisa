import { readItems } from '@directus/sdk'
import { getServerClient } from './client'
import type { Listing, SearchParams } from '@/types/listing'

const LISTING_FIELDS = [
  'id',
  'slug',
  'translations.*',
  'offer_type',
  'property_type',
  'status',
  'price_amount',
  'price_currency',
  'price_on_request',
  'build_area_m2',
  'lot_area_m2',
  'bedrooms',
  'bathrooms',
  'furnished',
  'year_built',
  'condition',
  'location_id.*',
  'address',
  'lat',
  'lng',
  'agent_id',
  'featured',
  'video_url',
  'tour_url',
  'published_at',
  'created_at',
  'updated_at',
  'listing_media.*',
  'amenities.id',
  'amenities.amenities_id.*',
] as const

const BASE_FILTER = {
  status: { _nin: ['sold', 'rented'] },
  published_at: { _nnull: true },
}

export async function getListings(
  params: SearchParams = {}
): Promise<{ data: Listing[]; total: number }> {
  const client = getServerClient()
  const {
    offer_type,
    property_type,
    location_id,
    district,
    keyword,
    min_price,
    max_price,
    bedrooms,
    furnished,
    min_area,
    max_area,
    sort = 'newest',
    page = 1,
    limit = 12,
  } = params

  // Build filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {
    published_at: { _nnull: true },
  }

  if (offer_type) filter.offer_type = { _eq: offer_type }
  if (property_type) filter.property_type = { _eq: property_type }
  if (location_id) {
    filter.location_id = { _eq: location_id }
  } else if (district) {
    filter.location_id = { district: { _eq: district } }
  }
  if (bedrooms) filter.bedrooms = { _gte: bedrooms }
  if (furnished) filter.furnished = { _eq: furnished }
  if (min_price) filter.price_amount = { ...filter.price_amount, _gte: min_price }
  if (max_price) filter.price_amount = { ...filter.price_amount, _lte: max_price }
  if (min_area) filter.build_area_m2 = { ...filter.build_area_m2, _gte: min_area }
  if (max_area) filter.build_area_m2 = { ...filter.build_area_m2, _lte: max_area }
  if (keyword) {
    filter._or = [
      { translations: { title: { _icontains: keyword } } },
      { address: { _icontains: keyword } },
    ]
  }

  const sortMap: Record<string, string> = {
    newest: '-published_at',
    price_asc: 'price_amount',
    price_desc: '-price_amount',
    area_desc: '-build_area_m2',
  }

  const [data, countResult] = await Promise.all([
    client.request(
      readItems('listings', {
        filter,
        fields: LISTING_FIELDS as unknown as string[],
        sort: [sortMap[sort] ?? '-published_at'],
        limit,
        offset: (page - 1) * limit,
      })
    ),
    client.request(
      readItems('listings', {
        filter,
        fields: ['id'],
        limit: -1,
        aggregate: { count: ['id'] },
      })
    ),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const total = (countResult as any)[0]?.count?.id ?? 0

  return { data: data as unknown as Listing[], total: Number(total) }
}

export async function getListing(slug: string): Promise<Listing | null> {
  const client = getServerClient()
  const results = await client.request(
    readItems('listings', {
      filter: { slug: { _eq: slug }, published_at: { _nnull: true } },
      fields: LISTING_FIELDS as unknown as string[],
      limit: 1,
    })
  )
  if (!results || results.length === 0) return null
  return results[0] as unknown as Listing
}

export async function getFeaturedListings(): Promise<Listing[]> {
  const client = getServerClient()
  const results = await client.request(
    readItems('listings', {
      filter: { ...BASE_FILTER, featured: { _eq: true } },
      fields: LISTING_FIELDS as unknown as string[],
      sort: ['-published_at'],
      limit: 6,
    })
  )
  return results as unknown as Listing[]
}

export async function getNewListings(): Promise<Listing[]> {
  const client = getServerClient()
  const results = await client.request(
    readItems('listings', {
      filter: BASE_FILTER,
      fields: LISTING_FIELDS as unknown as string[],
      sort: ['-published_at'],
      limit: 6,
    })
  )
  return results as unknown as Listing[]
}

export async function getListingsByOfferType(offerType: 'sale' | 'rent', limit = 3): Promise<Listing[]> {
  const client = getServerClient()
  const results = await client.request(
    readItems('listings', {
      filter: { ...BASE_FILTER, offer_type: { _eq: offerType } },
      fields: LISTING_FIELDS as unknown as string[],
      sort: ['-published_at'],
      limit,
    })
  )
  return results as unknown as Listing[]
}

export async function getAllPublishedSlugs(): Promise<string[]> {
  const client = getServerClient()
  const results = await client.request(
    readItems('listings', {
      filter: { published_at: { _nnull: true } },
      fields: ['slug'],
      limit: -1,
    })
  )
  return (results as { slug: string }[]).map((r) => r.slug)
}
