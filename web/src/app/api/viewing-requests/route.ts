import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { submitViewingRequest } from '@/lib/directus/inquiries'

const viewingSchema = z.object({
  listing_id: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional().nullable(),
  preferred_date: z.string().min(1),
  preferred_time: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = viewingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    await submitViewingRequest({
      ...parsed.data,
      phone: parsed.data.phone ?? null,
      preferred_time: parsed.data.preferred_time ?? null,
      notes: parsed.data.notes ?? null,
    })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('Viewing request submit error:', err)
    return NextResponse.json({ error: 'Failed to submit viewing request' }, { status: 500 })
  }
}
