import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

const PM_URL = process.env.PM_INTERNAL_URL ?? process.env.NEXT_PUBLIC_PM_URL ?? 'http://localhost:8001'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Forward the multipart form data directly to the PM API
  const formData = await req.formData()
  const res = await fetch(`${PM_URL}/api/v1/portal/tickets/${params.id}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData as unknown as BodyInit,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
