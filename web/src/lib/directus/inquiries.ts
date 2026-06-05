import type { Inquiry, ViewingRequest } from '@/types/crm'

// All functions run server-side in API routes; they hold the write token.

function directusConfig() {
  const url = process.env.DIRECTUS_INTERNAL_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL
  const token = process.env.DIRECTUS_SERVER_TOKEN
  if (!url || !token) throw new Error('Directus config missing')
  return { url, token, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
}

async function getListingAgent(url: string, headers: Record<string, string>, listingId: string) {
  const res = await fetch(`${url}/items/listings/${listingId}?fields=agent_id`, { headers })
  if (!res.ok) return null
  const data = await res.json()
  return (data.data?.agent_id as string | null) ?? null
}

async function getAgentEmail(url: string, headers: Record<string, string>, agentId: string) {
  const res = await fetch(`${url}/users/${agentId}?fields=email,first_name`, { headers })
  if (!res.ok) return null
  return (data => data ? { email: data.email as string, name: data.first_name as string | null } : null)(
    (await res.json()).data
  )
}

async function createLead(url: string, headers: Record<string, string>, lead: {
  contact_name: string
  email: string
  phone: string | null
  source: 'inquiry' | 'viewing'
  linked_inquiry_id?: string | null
  linked_viewing_id?: string | null
  listing_id?: string | null
  agent_id?: string | null
}) {
  const res = await fetch(`${url}/items/leads`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...lead, stage: 'new' }),
  })
  if (!res.ok) {
    console.error('Failed to create lead:', await res.text())
  }
}

async function sendNotificationEmails(opts: {
  agentEmail: string | null
  agentName: string | null
  centralInbox: string
  subject: string
  htmlBody: string
}) {
  const apiKey = process.env.EMAIL_API_KEY
  const from = process.env.EMAIL_FROM
  const provider = process.env.EMAIL_PROVIDER ?? 'postmark'
  if (!apiKey || !from) return

  const recipients = [opts.centralInbox]
  if (opts.agentEmail && opts.agentEmail !== opts.centralInbox) recipients.push(opts.agentEmail)

  for (const to of recipients) {
    try {
      if (provider === 'postmark') {
        await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Postmark-Server-Token': apiKey },
          body: JSON.stringify({ From: from, To: to, Subject: opts.subject, HtmlBody: opts.htmlBody }),
        })
      } else if (provider === 'resend') {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ from, to, subject: opts.subject, html: opts.htmlBody }),
        })
      }
    } catch (err) {
      console.error('Email notification error:', err)
    }
  }
}

function inquiryHtml(data: Omit<Inquiry, 'id' | 'created_at'>) {
  return `<p><strong>New inquiry</strong> received via Far East Property Management.</p>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td><td>${data.name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td>${data.email}</td></tr>
  ${data.phone ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Phone</td><td>${data.phone}</td></tr>` : ''}
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Listing</td><td>${data.listing_id}</td></tr>
</table>
<p style="margin-top:16px;"><strong>Message:</strong><br>${data.message.replace(/\n/g, '<br>')}</p>`
}

function viewingHtml(data: Omit<ViewingRequest, 'id' | 'created_at'>) {
  return `<p><strong>New viewing request</strong> received via Far East Property Management.</p>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td><td>${data.name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td>${data.email}</td></tr>
  ${data.phone ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Phone</td><td>${data.phone}</td></tr>` : ''}
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Listing</td><td>${data.listing_id}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Date</td><td>${data.preferred_date}${data.preferred_time ? ` at ${data.preferred_time}` : ''}</td></tr>
  ${data.notes ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Notes</td><td>${data.notes}</td></tr>` : ''}
</table>`
}

export async function submitInquiry(data: Omit<Inquiry, 'id' | 'created_at'>): Promise<void> {
  const { url, token, headers } = directusConfig()
  const centralInbox = process.env.EMAIL_CENTRAL_INBOX ?? ''

  // Lookup agent from listing
  const agentId = await getListingAgent(url, headers, data.listing_id)
  const agentInfo = agentId ? await getAgentEmail(url, headers, agentId) : null

  // Store inquiry (with agent_id denormalized)
  const res = await fetch(`${url}/items/inquiries`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...data, agent_id: agentId }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to submit inquiry: ${err}`)
  }
  const inquiryData = await res.json()
  const inquiryId: string | undefined = inquiryData.data?.id

  // Auto-create lead
  await createLead(url, headers, {
    contact_name: data.name,
    email: data.email,
    phone: data.phone,
    source: 'inquiry',
    linked_inquiry_id: inquiryId ?? null,
    listing_id: data.listing_id,
    agent_id: agentId,
  })

  // Notify agent + central inbox
  await sendNotificationEmails({
    agentEmail: agentInfo?.email ?? null,
    agentName: agentInfo?.name ?? null,
    centralInbox,
    subject: `New inquiry — Far East`,
    htmlBody: inquiryHtml(data),
  })
}

export async function submitViewingRequest(data: Omit<ViewingRequest, 'id' | 'created_at'>): Promise<void> {
  const { url, headers } = directusConfig()
  const centralInbox = process.env.EMAIL_CENTRAL_INBOX ?? ''

  const agentId = await getListingAgent(url, headers, data.listing_id)
  const agentInfo = agentId ? await getAgentEmail(url, headers, agentId) : null

  const res = await fetch(`${url}/items/viewing_requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...data, agent_id: agentId }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to submit viewing request: ${err}`)
  }
  const viewingData = await res.json()
  const viewingId: string | undefined = viewingData.data?.id

  await createLead(url, headers, {
    contact_name: data.name,
    email: data.email,
    phone: data.phone,
    source: 'viewing',
    linked_viewing_id: viewingId ?? null,
    listing_id: data.listing_id,
    agent_id: agentId,
  })

  await sendNotificationEmails({
    agentEmail: agentInfo?.email ?? null,
    agentName: agentInfo?.name ?? null,
    centralInbox,
    subject: `New viewing request — Far East`,
    htmlBody: viewingHtml(data),
  })
}
