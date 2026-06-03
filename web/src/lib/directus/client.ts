import { createDirectus, rest, staticToken } from '@directus/sdk'

export function getDirectusClient() {
  const url = process.env.NEXT_PUBLIC_DIRECTUS_URL
  if (!url) throw new Error('NEXT_PUBLIC_DIRECTUS_URL is not set')
  return createDirectus(url).with(rest())
}

export function getServerClient() {
  const url = process.env.NEXT_PUBLIC_DIRECTUS_URL
  const token = process.env.DIRECTUS_SERVER_TOKEN
  if (!url) throw new Error('NEXT_PUBLIC_DIRECTUS_URL is not set')
  if (!token) throw new Error('DIRECTUS_SERVER_TOKEN is not set')
  return createDirectus(url).with(rest()).with(staticToken(token))
}
