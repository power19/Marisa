export type OfferType = 'sale' | 'rent'
export type PropertyType = 'residential' | 'land' | 'commercial' | 'apartment' | 'vacation' | 'expat'
export type ListingStatus = 'new' | 'reduced' | 'under_contract' | 'sold' | 'rented' | 'price_on_request' | 'available'
export type Currency = 'USD' | 'EUR' | 'SRD'
export type FurnishedStatus = 'furnished' | 'unfurnished' | 'partially'
export type ConditionStatus = 'new_build' | 'excellent' | 'good' | 'needs_work'
export type MediaKind = 'photo' | 'floorplan' | 'brochure_pdf'

export interface ListingTranslation {
  languages_code: string
  title: string
  description: string | null
}

export interface Location {
  id: string
  district: string
  sub_area: string | null
}

export interface Amenity {
  id: string
  name: string
  icon: string | null
}

export interface ListingAmenity {
  id: string
  amenities_id: Amenity
}

export interface ListingMedia {
  id: string
  listing_id: string
  file: string // Directus file UUID
  kind: MediaKind
  sort: number | null
  is_primary: boolean
  alt: string | null
}

export interface Listing {
  id: string
  slug: string
  translations: ListingTranslation[]
  offer_type: OfferType
  property_type: PropertyType
  status: ListingStatus
  price_amount: number | null
  price_currency: Currency
  price_on_request: boolean
  build_area_m2: number | null
  lot_area_m2: number | null
  bedrooms: number | null
  bathrooms: number | null
  furnished: FurnishedStatus | null
  year_built: number | null
  condition: ConditionStatus | null
  location_id: Location | null
  address: string | null
  lat: number | null
  lng: number | null
  agent_id: string | null
  amenities: ListingAmenity[]
  featured: boolean
  video_url: string | null
  tour_url: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  listing_media: ListingMedia[]
}

export interface SearchParams {
  offer_type?: OfferType
  property_type?: PropertyType
  location_id?: string  // specific sub-area row id
  district?: string     // filter all locations in a district
  keyword?: string
  min_price?: number
  max_price?: number
  bedrooms?: number
  furnished?: FurnishedStatus
  min_area?: number
  max_area?: number
  amenities?: string[]
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'area_desc'
  page?: number
  limit?: number
}
