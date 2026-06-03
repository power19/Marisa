import type { Inquiry, ViewingRequest } from '@/types/crm'

// These functions are called from API routes which hold the write token server-side.
// They POST directly to Directus REST API to avoid SDK bundle in API routes.

export async function submitInquiry(data: Omit<Inquiry, 'id' | 'created_at'>): Promise<void> {
  const url = process.env.NEXT_PUBLIC_DIRECTUS_URL
  const token = process.env.DIRECTUS_SERVER_TOKEN
  if (!url || !token) throw new Error('Directus config missing')

  const res = await fetch(`${url}/items/inquiries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to submit inquiry: ${err}`)
  }
}

export async function submitViewingRequest(data: Omit<ViewingRequest, 'id' | 'created_at'>): Promise<void> {
  const url = process.env.NEXT_PUBLIC_DIRECTUS_URL
  const token = process.env.DIRECTUS_SERVER_TOKEN
  if (!url || !token) throw new Error('Directus config missing')

  const res = await fetch(`${url}/items/viewing_requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to submit viewing request: ${err}`)
  }
}
