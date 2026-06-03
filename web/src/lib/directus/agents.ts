import { readItems } from '@directus/sdk'
import { getServerClient } from './client'
import type { Agent } from '@/types/agent'

export async function getAgents(): Promise<Agent[]> {
  const client = getServerClient()
  const results = await client.request(
    readItems('agents', {
      filter: { approved: { _eq: true } },
      fields: ['id', 'user_id', 'display_name', 'photo', 'phone', 'whatsapp', 'email', 'approved', 'translations.*'],
      sort: ['display_name'],
    })
  )
  return results as unknown as Agent[]
}
