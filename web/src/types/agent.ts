export interface AgentTranslation {
  languages_code: string
  bio: string | null
}

export interface Agent {
  id: string
  user_id: string
  display_name: string
  photo: string | null // Directus file UUID
  phone: string | null
  whatsapp: string | null
  email: string | null
  translations: AgentTranslation[]
  approved: boolean
}
