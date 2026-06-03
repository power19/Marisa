/**
 * Directus seed runner — run once on first deploy after schema apply.
 *
 * Usage (from docker compose):
 *   docker compose run --rm directus node /directus/seed/run.js
 *
 * What it does:
 *   1. Seeds languages (en, nl, srn)
 *   2. Seeds locations (Suriname districts)
 *   3. Seeds amenities with translations
 *   4. Creates Directus roles (agent, registered_visitor, tenant, owner)
 *   5. Sets agent item-level permission (agent_id = $CURRENT_USER) on listings
 *   6. Sets public role: read-only on listings, locations, amenities, agents
 */

const { createDirectus, rest, authentication, staticToken } = require("@directus/sdk");

const DIRECTUS_URL = process.env.PUBLIC_URL || "http://localhost:8055";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD env vars are required");
  process.exit(1);
}

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function main() {
  console.log(`Connecting to Directus at ${DIRECTUS_URL}…`);
  await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log("Authenticated as admin.");

  await seedLanguages();
  await seedLocations();
  await seedAmenities();
  await createRoles();

  console.log("\nSeed complete.");
}

async function seedLanguages() {
  console.log("\n→ Seeding languages…");
  const languages = [
    { code: "en", name: "English", direction: "ltr" },
    { code: "nl", name: "Nederlands", direction: "ltr" },
    { code: "srn", name: "Sranantongo", direction: "ltr" },
  ];
  for (const lang of languages) {
    try {
      await client.request(
        require("@directus/sdk").createItem("languages", lang)
      );
      console.log(`  + language ${lang.code}`);
    } catch (e) {
      if (e?.errors?.[0]?.extensions?.code === "RECORD_NOT_UNIQUE") {
        console.log(`  ~ language ${lang.code} already exists`);
      } else {
        throw e;
      }
    }
  }
}

async function seedLocations() {
  console.log("\n→ Seeding locations…");
  const locations = require("./locations.json");
  for (const loc of locations) {
    try {
      await client.request(
        require("@directus/sdk").createItem("locations", loc)
      );
      const label = loc.sub_area ? `${loc.district} / ${loc.sub_area}` : loc.district;
      console.log(`  + ${label}`);
    } catch (e) {
      console.log(`  ~ skipped (may already exist): ${loc.district} / ${loc.sub_area}`);
    }
  }
}

async function seedAmenities() {
  console.log("\n→ Seeding amenities…");
  const amenities = require("./amenities.json");
  const { createItem } = require("@directus/sdk");
  for (const amenity of amenities) {
    try {
      const created = await client.request(
        createItem("amenities", {
          icon: amenity.icon,
          name: amenity.translations.map((t) => ({
            languages_code: t.languages_code,
            name: t.name,
          })),
        })
      );
      const enName = amenity.translations.find((t) => t.languages_code === "en")?.name;
      console.log(`  + ${enName}`);
    } catch (e) {
      const enName = amenity.translations.find((t) => t.languages_code === "en")?.name;
      console.log(`  ~ skipped (may already exist): ${enName}`);
    }
  }
}

async function createRoles() {
  console.log("\n→ Creating roles…");
  const { createRole, readRoles, createPermission } = require("@directus/sdk");

  const roleDefs = [
    { name: "Agent", icon: "person", description: "Real estate agent — manages own listings" },
    { name: "Registered Visitor", icon: "person_outline", description: "Registered public user — can save searches" },
    { name: "Tenant", icon: "key", description: "Tenant — PM portal access via FastAPI JWT" },
    { name: "Owner", icon: "business", description: "Property owner — PM portal access via FastAPI JWT" },
  ];

  const existingRoles = await client.request(readRoles({ fields: ["name", "id"] }));
  const existingNames = new Set(existingRoles.map((r) => r.name));

  const roleIds = {};

  for (const roleDef of roleDefs) {
    if (existingNames.has(roleDef.name)) {
      const existing = existingRoles.find((r) => r.name === roleDef.name);
      roleIds[roleDef.name] = existing.id;
      console.log(`  ~ role "${roleDef.name}" already exists`);
    } else {
      const created = await client.request(createRole(roleDef));
      roleIds[roleDef.name] = created.id;
      console.log(`  + role "${roleDef.name}" (${created.id})`);
    }
  }

  // Agent permissions: CRUD on listings where agent_id = $CURRENT_USER
  const agentRoleId = roleIds["Agent"];
  if (agentRoleId) {
    await setAgentPermissions(agentRoleId, createPermission);
  }

  // Public role permissions: read-only on listings, locations, amenities, agents
  await setPublicPermissions(createPermission);
}

async function setAgentPermissions(agentRoleId, createPermission) {
  console.log("\n→ Setting agent permissions…");

  const agentPerms = [
    // listings: CRUD with item-level filter
    {
      role: agentRoleId,
      collection: "listings",
      action: "read",
      fields: "*",
      permissions: { agent_id: { _eq: "$CURRENT_USER" } },
    },
    {
      role: agentRoleId,
      collection: "listings",
      action: "create",
      fields: "*",
      permissions: {},
      validation: {},
      presets: { agent_id: "$CURRENT_USER" },
    },
    {
      role: agentRoleId,
      collection: "listings",
      action: "update",
      fields: "*",
      permissions: { agent_id: { _eq: "$CURRENT_USER" } },
    },
    {
      role: agentRoleId,
      collection: "listings",
      action: "delete",
      permissions: { agent_id: { _eq: "$CURRENT_USER" } },
    },
    // listing_media: CRUD scoped through listing
    {
      role: agentRoleId,
      collection: "listing_media",
      action: "read",
      fields: "*",
      permissions: { listing_id: { agent_id: { _eq: "$CURRENT_USER" } } },
    },
    {
      role: agentRoleId,
      collection: "listing_media",
      action: "create",
      fields: "*",
      permissions: {},
    },
    {
      role: agentRoleId,
      collection: "listing_media",
      action: "update",
      fields: "*",
      permissions: { listing_id: { agent_id: { _eq: "$CURRENT_USER" } } },
    },
    {
      role: agentRoleId,
      collection: "listing_media",
      action: "delete",
      permissions: { listing_id: { agent_id: { _eq: "$CURRENT_USER" } } },
    },
    // listings_translations: CRUD scoped through listing
    {
      role: agentRoleId,
      collection: "listings_translations",
      action: "read",
      fields: "*",
      permissions: { listings_id: { agent_id: { _eq: "$CURRENT_USER" } } },
    },
    {
      role: agentRoleId,
      collection: "listings_translations",
      action: "create",
      fields: "*",
      permissions: {},
    },
    {
      role: agentRoleId,
      collection: "listings_translations",
      action: "update",
      fields: "*",
      permissions: { listings_id: { agent_id: { _eq: "$CURRENT_USER" } } },
    },
    // read-only on lookup tables
    { role: agentRoleId, collection: "locations", action: "read", fields: "*", permissions: {} },
    { role: agentRoleId, collection: "amenities", action: "read", fields: "*", permissions: {} },
    { role: agentRoleId, collection: "amenities_translations", action: "read", fields: "*", permissions: {} },
    { role: agentRoleId, collection: "languages", action: "read", fields: "*", permissions: {} },
    // own agent profile
    {
      role: agentRoleId,
      collection: "agents",
      action: "read",
      fields: "*",
      permissions: { user_id: { _eq: "$CURRENT_USER" } },
    },
    {
      role: agentRoleId,
      collection: "agents",
      action: "update",
      fields: ["display_name", "photo", "phone", "whatsapp", "email", "bio"],
      permissions: { user_id: { _eq: "$CURRENT_USER" } },
    },
    { role: agentRoleId, collection: "agents_translations", action: "read", fields: "*", permissions: {} },
    {
      role: agentRoleId,
      collection: "agents_translations",
      action: "create",
      fields: "*",
      permissions: {},
    },
    {
      role: agentRoleId,
      collection: "agents_translations",
      action: "update",
      fields: "*",
      permissions: {},
    },
  ];

  for (const perm of agentPerms) {
    try {
      await client.request(createPermission(perm));
    } catch (e) {
      // Duplicate permissions are fine — skip
    }
  }
  console.log("  + agent item-level permissions set");
}

async function setPublicPermissions(createPermission) {
  console.log("\n→ Setting public role permissions (no token — read-only public data)…");

  const publicPerms = [
    // listings: read published fields — no PII
    {
      role: null, // null = public role
      collection: "listings",
      action: "read",
      fields: [
        "id", "slug", "offer_type", "property_type", "status",
        "price_amount", "price_currency", "price_on_request",
        "build_area_m2", "lot_area_m2", "bedrooms", "bathrooms",
        "furnished", "year_built", "condition",
        "location_id", "lat", "lng",
        "featured", "video_url", "tour_url", "published_at",
        "translations", "amenities", "media",
      ],
      permissions: { published_at: { _nnull: true } },
    },
    { role: null, collection: "listings_translations", action: "read", fields: ["id", "listings_id", "languages_code", "title", "description"], permissions: {} },
    { role: null, collection: "listing_media", action: "read", fields: ["id", "listing_id", "file", "kind", "sort", "is_primary", "alt"], permissions: {} },
    { role: null, collection: "listing_media_translations", action: "read", fields: "*", permissions: {} },
    { role: null, collection: "listings_amenities", action: "read", fields: "*", permissions: {} },
    { role: null, collection: "locations", action: "read", fields: "*", permissions: {} },
    { role: null, collection: "amenities", action: "read", fields: "*", permissions: {} },
    { role: null, collection: "amenities_translations", action: "read", fields: "*", permissions: {} },
    { role: null, collection: "languages", action: "read", fields: "*", permissions: {} },
    // agents: display fields only — NO email, phone exposed
    {
      role: null,
      collection: "agents",
      action: "read",
      fields: ["id", "display_name", "photo", "whatsapp", "bio", "approved"],
      permissions: { approved: { _eq: true } },
    },
    { role: null, collection: "agents_translations", action: "read", fields: ["id", "agents_id", "languages_code", "bio"], permissions: {} },
  ];

  for (const perm of publicPerms) {
    try {
      await client.request(createPermission(perm));
    } catch (e) {
      // Duplicate permissions are fine — skip
    }
  }
  console.log("  + public read-only permissions set");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
