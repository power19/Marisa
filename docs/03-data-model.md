# 03 — Data Model

> Source of truth for data. Directus owns the content/CRM/user collections; FastAPI owns the
> `pm` schema. Both live in the same Postgres. Money is `NUMERIC(14,2)` + a currency enum;
> never floats. All user-facing text is translatable to `en/nl/srn`.

## Enums

```
offer_type     : sale | rent
property_type  : residential | land | commercial | apartment | vacation | expat
listing_status : new | reduced | under_contract | sold | rented | price_on_request | available
currency       : USD | EUR | SRD
furnished      : furnished | unfurnished | partially
condition      : new_build | excellent | good | needs_work
user_role      : admin | agent | registered_visitor | tenant | owner
lead_stage     : new | contacted | viewing | negotiating | won | lost   (configurable)
ticket_status  : open | in_progress | on_hold | resolved | closed
charge_status  : due | partial | paid | overdue | waived
lease_status   : draft | active | ended | terminated
```

## Directus collections (content, CRM, users)

### `listings` (central entity)
```
id (uuid, pk)
slug (unique)
title            -> translations(en/nl/srn)
description      -> translations(en/nl/srn)
offer_type       (enum)
property_type    (enum)
status           (enum listing_status)
price_amount     NUMERIC(14,2) nullable   -- null when price_on_request
price_currency   (enum currency)
price_on_request boolean default false
build_area_m2    NUMERIC(10,2) nullable
lot_area_m2      NUMERIC(10,2) nullable
bedrooms         int nullable
bathrooms        int nullable
furnished        (enum furnished) nullable
year_built       int nullable
condition        (enum condition) nullable
location_id      -> locations (m2o)
address          text nullable
lat              double, lng double         -- exact pin
agent_id         -> directus_users (m2o)    -- listing owner
amenities        -> m2m amenities
featured         boolean default false
video_url        text nullable              -- external embed
tour_url         text nullable              -- external 360/virtual
published_at, created_at, updated_at
```

### `locations` (Suriname districts — seed data)
```
id, district, sub_area
Seed: Paramaribo (Centrum/Noord/West/Zuid), Wanica, Commewijne, Para,
      Saramacca, Nickerie, Coronie, Brokopondo
```

### `listing_media`
```
id, listing_id (m2o), file (R2 key/Directus file), kind (photo|floorplan|brochure_pdf),
sort int, is_primary boolean, alt -> translations
```
> Video/360 are URLs on the listing, not rows here.

### `amenities`
```
id, name -> translations, icon nullable     -- e.g. AC, Pool, Parking, Garden, Security
```

### `agents`  (profile extending `directus_users`)
```
user_id (m2o directus_users), display_name, photo, phone, whatsapp, email,
bio -> translations, approved boolean default false
```
> Agent accounts self-register into a **pending** state (`approved=false`) and require
> admin activation. Permissions: an agent may CRUD only listings where `agent_id = $CURRENT_USER`.

### `inquiries`
```
id, listing_id (m2o), name, email, phone, message, channel (form|whatsapp|phone),
agent_id (m2o, denormalized from listing), created_at
```

### `viewing_requests`
```
id, listing_id (m2o), name, email, phone, preferred_date, preferred_time, notes,
status (requested|confirmed|declined|done), agent_id (m2o), created_at
```

### CRM — `leads`, `lead_notes`, `lead_followups`
```
leads:         id, contact_name, email, phone, source(inquiry|viewing|manual),
               linked_inquiry_id nullable, listing_id nullable, agent_id (m2o),
               stage (enum lead_stage), created_at, updated_at
lead_notes:    id, lead_id (m2o), author (m2o users), body, created_at
lead_followups:id, lead_id (m2o), due_at, note, done boolean, assignee (m2o users)
```
> Every `inquiry` and `viewing_request` auto-creates/links a `lead`. Routing notifies the
> listing's `agent_id` **and** the central inbox. Follow-ups due → worker sends reminders.

### Public accounts — `saved_searches`
```
registered visitors are directus_users with role=registered_visitor
saved_searches: id, user_id (m2o), name, criteria_json (filters), alert_frequency
                (instant|daily|weekly), last_notified_at, created_at
```
> Worker matches new/updated `listings` against `criteria_json` and emails the user.

## `pm` schema (FastAPI / Alembic-managed)

> Authenticated via Directus tokens. `tenant`/`owner` are Directus roles; rows below
> reference `directus_users.id` where a login is involved.

### `pm.owners`
```
id, user_id (nullable, -> directus_users for future portal), name, email, phone,
payout_notes
```

### `pm.units`  (a managed physical unit; may map to a listing)
```
id, listing_id (nullable -> listings), owner_id (-> pm.owners),
label, address, notes
```
> A rental listing becomes a managed unit once leased. Different lifecycles — keep separate,
> link by optional `listing_id`.

### `pm.tenants`
```
id, user_id (-> directus_users, role=tenant), name, email, phone,
id_document (R2 key, ACCESS-RESTRICTED, encrypted), created_at
```

### `pm.leases`
```
id, unit_id (-> pm.units), tenant_id (-> pm.tenants),
start_date, end_date, rent_amount NUMERIC(14,2), rent_currency (enum currency),
deposit_amount NUMERIC(14,2), billing_day int (1-28), status (enum lease_status),
created_at
```

### `pm.rent_charges`  (generated per billing period from the lease)
```
id, lease_id (-> pm.leases), period (date, first of month), amount_due NUMERIC(14,2),
currency (enum), due_date, amount_paid NUMERIC(14,2) default 0,
status (enum charge_status), created_at
```

### `pm.payments`  (manual records against a charge)
```
id, charge_id (-> pm.rent_charges), amount NUMERIC(14,2), currency (enum),
paid_on date, method (cash|bank|other), recorded_by (-> directus_users),
receipt_pdf (R2 key, generated), created_at
```

### `pm.maintenance_tickets`
```
id, unit_id (-> pm.units), reported_by (-> directus_users, usually tenant),
title, description, status (enum ticket_status), photos (R2 keys[]),
assignee (-> directus_users) nullable, created_at, resolved_at nullable
```

### `pm.owner_statements`
```
id, owner_id (-> pm.owners), period_start, period_end,
rent_collected NUMERIC(14,2), mgmt_fee NUMERIC(14,2), net_payout NUMERIC(14,2),
currency (enum), pdf (R2 key, generated), sent_at nullable, created_at
```

## Relationships summary

- `listings` 1—* `listing_media`; `listings` *—* `amenities`; `listings` *—1 `locations`, `agents`.
- `inquiries`/`viewing_requests` —1 `listings`; each → a `lead`.
- `leads` 1—* `lead_notes`, `lead_followups`.
- `pm.units` —1 `pm.owners`, optional —1 `listings`.
- `pm.leases` —1 `pm.units`, `pm.tenants`; 1—* `pm.rent_charges`; charge 1—* `pm.payments`.
- `pm.owner_statements` —1 `pm.owners`.

## i18n & money rules

- Translatable fields use Directus translations. Missing `nl`/`srn` falls back to `en`.
- Store `amount` + `currency` together; **display native only** in v1.
- Receipts/statements render in the charge/lease currency.
