import { createDirectus, rest, staticToken } from '@directus/sdk'

// Server-side: use internal Docker network URL if available (avoids localhost routing inside container)
// Client-side: falls back to the public NEXT_PUBLIC_ URL baked into the bundle
function getDirectusUrl() {
  return process.env.DIRECTUS_INTERNAL_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? ''
}

export function getDirectusClient() {
  const url = getDirectusUrl()
  if (!url) throw new Error('NEXT_PUBLIC_DIRECTUS_URL is not set')
  return createDirectus(url).with(rest())
}

export function getServerClient() {
  const url = getDirectusUrl()
  const token = process.env.DIRECTUS_SERVER_TOKEN
  if (!url) throw new Error('NEXT_PUBLIC_DIRECTUS_URL is not set')
  if (!token) throw new Error('DIRECTUS_SERVER_TOKEN is not set')
  return createDirectus(url).with(rest()).with(staticToken(token))
}
