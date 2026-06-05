export interface Inquiry {
  id?: string
  listing_id: string
  name: string
  email: string
  phone: string | null
  message: string
  channel?: string
  agent_id?: string | null
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
  status?: string
  agent_id?: string | null
  created_at?: string
}

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'

export interface Lead {
  id?: string
  contact_name: string
  email: string
  phone: string | null
  source: 'inquiry' | 'viewing' | 'manual'
  linked_inquiry_id?: string | null
  linked_viewing_id?: string | null
  listing_id?: string | null
  agent_id?: string | null
  stage: LeadStage
  created_at?: string
  updated_at?: string
}
