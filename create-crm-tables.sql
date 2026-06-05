-- ── CRM ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name        varchar(255) NOT NULL,
  email               varchar(255) NOT NULL,
  phone               varchar(50),
  source              varchar(20) NOT NULL DEFAULT 'manual', -- inquiry|viewing|manual
  linked_inquiry_id   uuid,
  linked_viewing_id   uuid,
  listing_id          uuid REFERENCES listings(id) ON DELETE SET NULL,
  agent_id            uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  stage               varchar(30) NOT NULL DEFAULT 'new',   -- new|contacted|qualified|proposal|won|lost
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author     uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  body       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_followups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  due_at     timestamptz NOT NULL,
  note       text,
  done       boolean NOT NULL DEFAULT false,
  assignee   uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ── Contact channels ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inquiries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid REFERENCES listings(id) ON DELETE SET NULL,
  name         varchar(255) NOT NULL,
  email        varchar(255) NOT NULL,
  phone        varchar(50),
  message      text NOT NULL,
  channel      varchar(20) DEFAULT 'form',
  agent_id     uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_leads_inquiry') THEN
    ALTER TABLE leads ADD CONSTRAINT fk_leads_inquiry FOREIGN KEY (linked_inquiry_id) REFERENCES inquiries(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_leads_viewing') THEN
    ALTER TABLE leads ADD CONSTRAINT fk_leads_viewing FOREIGN KEY (linked_viewing_id) REFERENCES viewing_requests(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS viewing_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     uuid REFERENCES listings(id) ON DELETE SET NULL,
  name           varchar(255) NOT NULL,
  email          varchar(255) NOT NULL,
  phone          varchar(50),
  preferred_date varchar(20) NOT NULL,
  preferred_time varchar(20),
  notes          text,
  status         varchar(20) DEFAULT 'requested',
  agent_id       uuid REFERENCES directus_users(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now()
);
