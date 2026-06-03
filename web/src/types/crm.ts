export interface Inquiry {
  id?: string
  listing_id: string
  name: string
  email: string
  phone: string | null
  message: string
  created_at?: string
}

export interface ViewingRequest {
  id?: string
  listing_id: string
  name: string
  email: string
  phone: string | null
  preferred_date: string
  preferred_time: string | null
  notes: string | null
  created_at?: string
}
