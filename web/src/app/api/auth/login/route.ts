import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

const DIRECTUS_URL =
  process.env.DIRECTUS_INTERNAL_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? ''

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const { data } = await res.json()
  const token: string = data.access_token
  const expiresMs: number = data.expires ?? 900000

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(expiresMs / 1000),
    // secure: true — enable in production (HTTPS only)
  })
  return response
}
