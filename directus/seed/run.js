/**
 * Directus seed runner — run once after bootstrap + schema apply.
 *
 * Usage:
 *   docker compose run --rm directus node /directus/seed/run.js
 *
 * Idempotent — safe to run multiple times. Skips anything that already exists.
 *
 * What it does:
 *   1. Seeds languages (en, nl, srn)
 *   2. Seeds locations (Suriname districts)
 *   3. Seeds amenities with translations
 *   4. Creates roles: agent, registered_visitor, tenant, owner
 *   5. Sets agent item-level permission (agent_id = $CURRENT_USER)
 *   6. Sets public role read-only permissions (no PII)
 *
 * Uses native fetch (Node 18+) — no SDK dependency.
 */

const BASE_URL = process.env.PUBLIC_URL || "http://localhost:8055";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("ERROR: ADMIN_EMAIL and ADMIN_PASSWORD env vars are required");
  process.exit(1);
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

let token = null;

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${JSON.stringify(json)}`);
  token = json.data.access_token;
  console.log("Authenticated as admin.");
}

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

const get  = (path)        => api("GET",    path);
const post = (path, body)  => api("POST",   path, body);

// ─── Seed functions ──────────────────────────────────────────────────────────

async function seedLanguages() {
  console.log("\n→ Seeding languages…");
  const languages = [
    { code: "en", name: "English",      direction: "ltr" },
    { code: "nl", name: "Nederlands",   direction: "ltr" },
    { code: "srn", name: "Sranantongo", direction: "ltr" },
  ];

  const existing = await get("/items/languages");
  const existingCodes = new Set((existing.data.data || []).map((l) => l.code));

  for (const lang of languages) {
    if (existingCodes.has(lang.code)) {
      console.log(`  ~ ${lang.code} already exists`);
    } else {
      await post("/items/languages", lang);
      console.log(`  + ${lang.code}`);
    }
  }
}

async function seedLocations() {
  console.log("\n→ Seeding locations…");
  const { createRequire } = await import("module");
  const require = createRequire(import.meta?.url || `file://${process.cwd()}/`);
  const locations = require("./locations.json");

  const existing = await get("/items/locations?limit=-1&fields=district,sub_area");
  const existingSet = new Set(
    (existing.data.data || []).map((l) => `${l.district}|${l.sub_area}`)
  );

  let added = 0;
  for (const loc of locations) {
    const key = `${loc.district}|${loc.sub_area}`;
    if (existingSet.has(key)) continue;
    await post("/items/locations", loc);
    added++;
  }
  console.log(`  + ${added} locations added (${existingSet.size} already existed)`);
}

async function seedAmenities() {
  console.log("\n→ Seeding amenities…");
  const { createRequire } = await import("module");
  const require = createRequire(import.meta?.url || `file://${process.cwd()}/`);
  const amenities = require("./amenities.json");

  // We seed the whole amenity + translations in one POST
  // Directus handles nested translation inserts automatically
  let added = 0;
  for (const amenity of amenities) {
    const enName = amenity.translations.find((t) => t.languages_code === "en")?.name;

    const res = await post("/items/amenities", {
      icon: amenity.icon,
      name: amenity.translations,
    });

    if (res.ok) {
      console.log(`  + ${enName}`);
      added++;
    } else {
      console.log(`  ~ skipped: ${enName} (${JSON.stringify(res.data.errors?.[0]?.message)})`);
    }
  }
  console.log(`  ${added} amenities added`);
}

async function createRoles() {
  console.log("\n→ Creating roles…");

  const roleDefs = [
    { name: "Agent",              icon: "person",         description: "Real estate agent — manages own listings" },
    { name: "Registered Visitor", icon: "person_outline", description: "Registered public user — can save searches" },
    { name: "Tenant",             icon: "key",            description: "Tenant — PM portal access via FastAPI JWT" },
    { name: "Owner",              icon: "business",       description: "Property owner — PM portal access via FastAPI JWT" },
  ];

  const existing = await get("/roles?limit=-1&fields=id,name");
  const existingMap = Object.fromEntries(
    (existing.data.data || []).map((r) => [r.name, r.id])
  );

  const roleIds = { ...existingMap };

  for (const def of roleDefs) {
    if (existingMap[def.name]) {
      console.log(`  ~ "${def.name}" already exists (${existingMap[def.name]})`);
    } else {
      const res = await post("/roles", def);
      if (res.ok) {
        roleIds[def.name] = res.data.data.id;
        console.log(`  + "${def.name}" (${res.data.data.id})`);
      } else {
        console.error(`  ✗ Failed to create "${def.name}":`, res.data);
      }
    }
  }

  return roleIds;
}

async function setAgentPermissions(agentRoleId) {
  console.log("\n→ Setting agent permissions…");

  const perms = [
    // listings — CRUD own only
    { collection: "listings", action: "read",   fields: ["*"], permissions: { agent_id: { _eq: "$CURRENT_USER" } } },
    { collection: "listings", action: "create", fields: ["*"], permissions: {}, presets: { agent_id: "$CURRENT_USER" } },
    { collection: "listings", action: "update", fields: ["*"], permissions: { agent_id: { _eq: "$CURRENT_USER" } } },
    { collection: "listings", action: "delete", fields: ["*"], permissions: { agent_id: { _eq: "$CURRENT_USER" } } },
    // listings_translations
    { collection: "listings_translations", action: "read",   fields: ["*"], permissions: {} },
    { collection: "listings_translations", action: "create", fields: ["*"], permissions: {} },
    { collection: "listings_translations", action: "update", fields: ["*"], permissions: {} },
    // listing_media
    { collection: "listing_media", action: "read",   fields: ["*"], permissions: {} },
    { collection: "listing_media", action: "create", fields: ["*"], permissions: {} },
    { collection: "listing_media", action: "update", fields: ["*"], permissions: {} },
    { collection: "listing_media", action: "delete", fields: ["*"], permissions: {} },
    // listing_media_translations
    { collection: "listing_media_translations", action: "read",   fields: ["*"], permissions: {} },
    { collection: "listing_media_translations", action: "create", fields: ["*"], permissions: {} },
    { collection: "listing_media_translations", action: "update", fields: ["*"], permissions: {} },
    // listings_amenities
    { collection: "listings_amenities", action: "read",   fields: ["*"], permissions: {} },
    { collection: "listings_amenities", action: "create", fields: ["*"], permissions: {} },
    { collection: "listings_amenities", action: "delete", fields: ["*"], permissions: {} },
    // lookup tables — read only
    { collection: "locations",              action: "read", fields: ["*"], permissions: {} },
    { collection: "amenities",              action: "read", fields: ["*"], permissions: {} },
    { collection: "amenities_translations", action: "read", fields: ["*"], permissions: {} },
    { collection: "languages",              action: "read", fields: ["*"], permissions: {} },
    // own agent profile
    { collection: "agents", action: "read",   fields: ["*"], permissions: { user_id: { _eq: "$CURRENT_USER" } } },
    { collection: "agents", action: "update", fields: ["display_name", "photo", "phone", "whatsapp", "email", "bio"], permissions: { user_id: { _eq: "$CURRENT_USER" } } },
    { collection: "agents_translations", action: "read",   fields: ["*"], permissions: {} },
    { collection: "agents_translations", action: "create", fields: ["*"], permissions: {} },
    { collection: "agents_translations", action: "update", fields: ["*"], permissions: {} },
  ];

  let created = 0;
  for (const perm of perms) {
    const res = await post("/permissions", { role: agentRoleId, ...perm });
    if (res.ok) created++;
  }
  console.log(`  + ${created} agent permissions set`);
}

async function setPublicPermissions() {
  console.log("\n→ Setting public role permissions…");

  const perms = [
    // listings — read published only, no PII
    {
      collection: "listings",
      action: "read",
      fields: ["id","slug","offer_type","property_type","status","price_amount","price_currency",
               "price_on_request","build_area_m2","lot_area_m2","bedrooms","bathrooms","furnished",
               "year_built","condition","location_id","lat","lng","featured","video_url","tour_url",
               "published_at","translations","amenities","media","agent_id"],
      permissions: { published_at: { _nnull: true } },
    },
    { collection: "listings_translations",       action: "read", fields: ["*"], permissions: {} },
    { collection: "listing_media",               action: "read", fields: ["id","listing_id","file","kind","sort","is_primary","alt"], permissions: {} },
    { collection: "listing_media_translations",  action: "read", fields: ["*"], permissions: {} },
    { collection: "listings_amenities",          action: "read", fields: ["*"], permissions: {} },
    { collection: "locations",                   action: "read", fields: ["*"], permissions: {} },
    { collection: "amenities",                   action: "read", fields: ["*"], permissions: {} },
    { collection: "amenities_translations",      action: "read", fields: ["*"], permissions: {} },
    { collection: "languages",                   action: "read", fields: ["*"], permissions: {} },
    // agents — display fields only, approved agents only, NO email/phone
    {
      collection: "agents",
      action: "read",
      fields: ["id","display_name","photo","whatsapp","bio"],
      permissions: { approved: { _eq: true } },
    },
    { collection: "agents_translations", action: "read", fields: ["id","agents_id","languages_code","bio"], permissions: {} },
  ];

  let created = 0;
  for (const perm of perms) {
    const res = await post("/permissions", { role: null, ...perm });
    if (res.ok) created++;
  }
  console.log(`  + ${created} public permissions set`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Connecting to Directus at ${BASE_URL}…`);
  await login();

  await seedLanguages();
  await seedLocations();
  await seedAmenities();

  const roleIds = await createRoles();

  const agentRoleId = roleIds["Agent"];
  if (agentRoleId) {
    await setAgentPermissions(agentRoleId);
  } else {
    console.error("ERROR: Could not find Agent role ID — skipping permissions");
  }

  await setPublicPermissions();

  console.log("\n✓ Seed complete.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message || err);
  process.exit(1);
});
