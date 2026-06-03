import { readItems } from '@directus/sdk'
import { getDirectusClient } from './client'
import type { Location } from '@/types/listing'

export async function getLocations(): Promise<Location[]> {
  const client = getDirectusClient() // public — no token needed
  const results = await client.request(
    readItems('locations', {
      fields: ['id', 'district', 'sub_area'],
      sort: ['district', 'sub_area'],
      limit: -1,
    })
  )
  return results as unknown as Location[]
}
