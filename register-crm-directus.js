const fs = require('fs')
const env = Object.fromEntries(
  fs.readFileSync('.env','utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const BASE = 'http://localhost:8055'
const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${env.DIRECTUS_SERVER_TOKEN}` }

async function req(method, url, body) {
  const r = await fetch(BASE + url, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
  const d = await r.json()
  if (!r.ok && !d.errors?.[0]?.message?.includes('already')) {
    console.error(`  ${method} ${url}:`, JSON.stringify(d.errors?.[0]?.message ?? d).slice(0,200))
  }
  return { ok: r.ok, data: d.data }
}

async function registerCollection(collection, icon, note) {
  const r = await fetch(`${BASE}/collections`, {
    method: 'POST', headers: h,
    body: JSON.stringify({ collection, schema: {}, meta: { icon, note, sort_field: 'created_at' } })
  })
  const d = await r.json()
  if (r.ok || d.errors?.[0]?.message?.includes('already')) {
    console.log(`✓ ${collection} registered`)
    return true
  }
  console.log(`✗ ${collection}: ${JSON.stringify(d.errors?.[0]?.message).slice(0,100)}`)
  return false
}

async function main() {
  // ── Register inquiries + viewing_requests ─────────────────────────────────
  await registerCollection('inquiries', 'mail', 'Contact form submissions from the public site')
  await registerCollection('viewing_requests', 'calendar_month', 'Viewing request submissions')

  // ── Register CRM collections ──────────────────────────────────────────────
  await registerCollection('leads', 'person', 'CRM leads — auto-created from inquiries/viewings')
  await registerCollection('lead_notes', 'note', 'Notes on a lead')
  await registerCollection('lead_followups', 'schedule', 'Follow-up tasks on a lead')

  // ── Set leads display template and sort ──────────────────────────────────
  await req('PATCH', '/collections/leads', {
    meta: {
      icon: 'person',
      display_template: '{{contact_name}} — {{stage}}',
      sort_field: 'created_at',
    }
  })

  // ── Verify write access ───────────────────────────────────────────────────
  const testRes = await fetch(`${BASE}/items/inquiries`, {
    method: 'POST', headers: h,
    body: JSON.stringify({ name: 'Test', email: 't@t.com', message: 'Test' })
  })
  const testD = await testRes.json()
  if (testRes.ok) {
    console.log('✓ Write test passed — id:', testD.data?.id)
    await fetch(`${BASE}/items/inquiries/${testD.data?.id}`, { method: 'DELETE', headers: h })
    console.log('✓ Test record deleted')
  } else {
    console.log('✗ Write test failed:', JSON.stringify(testD.errors?.[0]?.message).slice(0,150))
  }

  console.log('\nDone! CRM collections registered.')
}
main().catch(console.error)
