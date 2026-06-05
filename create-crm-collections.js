const fs = require('fs')
const env = Object.fromEntries(
  fs.readFileSync('.env','utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const BASE = 'http://localhost:8055'
const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${env.DIRECTUS_SERVER_TOKEN}` }

async function post(url, body) {
  const r = await fetch(BASE + url, { method: 'POST', headers: h, body: JSON.stringify(body) })
  const d = await r.json()
  if (!r.ok && !d.errors?.[0]?.message?.includes('already exists')) {
    console.error('Error', url, JSON.stringify(d.errors?.[0]?.message ?? d).slice(0, 200))
  }
  return d
}

async function main() {
  // ── 1. Create inquiries collection ──────────────────────────────────────────
  await post('/collections', {
    collection: 'inquiries',
    meta: { icon: 'mail', note: 'Contact form submissions from the public site' },
    schema: {},
    fields: [
      { field: 'id',         type: 'uuid',    schema: { is_primary_key: true, default_value: 'auto' }, meta: { hidden: true, readonly: true } },
      { field: 'listing_id', type: 'uuid',    schema: { is_nullable: true },  meta: { interface: 'input', label: 'Listing ID' } },
      { field: 'name',       type: 'string',  schema: { is_nullable: false },  meta: { interface: 'input', label: 'Name', required: true } },
      { field: 'email',      type: 'string',  schema: { is_nullable: false },  meta: { interface: 'input', label: 'Email', required: true } },
      { field: 'phone',      type: 'string',  schema: { is_nullable: true },   meta: { interface: 'input', label: 'Phone' } },
      { field: 'message',    type: 'text',    schema: { is_nullable: false },  meta: { interface: 'input-multiline', label: 'Message', required: true } },
      { field: 'channel',    type: 'string',  schema: { is_nullable: true, default_value: 'form' }, meta: { interface: 'input', label: 'Channel' } },
      { field: 'created_at', type: 'timestamp', schema: { is_nullable: true, default_value: 'now' }, meta: { hidden: true, readonly: true } },
    ]
  })
  console.log('✓ inquiries collection created')

  // ── 2. Create viewing_requests collection ────────────────────────────────────
  await post('/collections', {
    collection: 'viewing_requests',
    meta: { icon: 'calendar', note: 'Viewing request submissions from the public site' },
    schema: {},
    fields: [
      { field: 'id',             type: 'uuid',    schema: { is_primary_key: true, default_value: 'auto' }, meta: { hidden: true, readonly: true } },
      { field: 'listing_id',     type: 'uuid',    schema: { is_nullable: true },  meta: { interface: 'input', label: 'Listing ID' } },
      { field: 'name',           type: 'string',  schema: { is_nullable: false },  meta: { interface: 'input', label: 'Name', required: true } },
      { field: 'email',          type: 'string',  schema: { is_nullable: false },  meta: { interface: 'input', label: 'Email', required: true } },
      { field: 'phone',          type: 'string',  schema: { is_nullable: true },   meta: { interface: 'input', label: 'Phone' } },
      { field: 'preferred_date', type: 'string',  schema: { is_nullable: false },  meta: { interface: 'input', label: 'Preferred Date', required: true } },
      { field: 'preferred_time', type: 'string',  schema: { is_nullable: true },   meta: { interface: 'input', label: 'Preferred Time' } },
      { field: 'notes',          type: 'text',    schema: { is_nullable: true },   meta: { interface: 'input-multiline', label: 'Notes' } },
      { field: 'status',         type: 'string',  schema: { is_nullable: true, default_value: 'requested' }, meta: { interface: 'select-dropdown', label: 'Status', options: { choices: [
        { text: 'Requested', value: 'requested' },
        { text: 'Confirmed', value: 'confirmed' },
        { text: 'Declined',  value: 'declined' },
        { text: 'Done',      value: 'done' },
      ]}}},
      { field: 'created_at',     type: 'timestamp', schema: { is_nullable: true, default_value: 'now' }, meta: { hidden: true, readonly: true } },
    ]
  })
  console.log('✓ viewing_requests collection created')

  // ── 3. Grant admin create permission on both (public role cannot write) ──────
  // The write token (admin) already has full access — no extra permissions needed.
  // Just verify we can POST a test inquiry
  const testRes = await fetch(`${BASE}/items/inquiries`, {
    method: 'POST', headers: h,
    body: JSON.stringify({ listing_id: null, name: 'Test', email: 'test@test.com', message: 'Test inquiry' })
  })
  const testData = await testRes.json()
  if (testRes.ok) {
    console.log('✓ inquiries write works — test record id:', testData.data?.id)
    // Delete test record
    await fetch(`${BASE}/items/inquiries/${testData.data?.id}`, { method: 'DELETE', headers: h })
  } else {
    console.log('✗ inquiries write test failed:', JSON.stringify(testData).slice(0,150))
  }

  console.log('\nDone! Forms should work now.')
}
main().catch(console.error)
