import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { submitInquiry } from '@/lib/directus/inquiries'
import { checkRateLimit } from '@/lib/utils/ratelimit'

const inquirySchema = z.object({
  listing_id: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional().nullable(),
  message: z.string().min(1).max(2000),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(`inquiry:${ip}`, 5, 300)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = inquirySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  try {
    await submitInquiry({ ...parsed.data, phone: parsed.data.phone ?? null })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('Inquiry submit error:', err)
    return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 })
  }
}
