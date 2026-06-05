"""create pm schema and tables

Revision ID: 0001
Revises:
Create Date: 2026-06-05
"""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE SCHEMA IF NOT EXISTS pm;

        -- Enums (idempotent)
        DO $$ BEGIN
            CREATE TYPE pm.lease_status AS ENUM ('draft','active','ended','terminated');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
            CREATE TYPE pm.charge_status AS ENUM ('due','partial','paid','overdue','waived');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
            CREATE TYPE pm.currency_enum AS ENUM ('USD','EUR','SRD');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
            CREATE TYPE pm.payment_method_enum AS ENUM ('cash','bank','other');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        DO $$ BEGIN
            CREATE TYPE pm.ticket_status AS ENUM ('open','in_progress','on_hold','resolved','closed');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        -- Tables
        CREATE TABLE IF NOT EXISTS pm.owners (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     VARCHAR(36),
            name        VARCHAR(200) NOT NULL,
            email       VARCHAR(200) NOT NULL,
            phone       VARCHAR(50),
            payout_notes TEXT
        );

        CREATE TABLE IF NOT EXISTS pm.units (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            listing_id  VARCHAR(36),
            owner_id    UUID NOT NULL REFERENCES pm.owners(id),
            label       VARCHAR(200) NOT NULL,
            address     TEXT,
            notes       TEXT
        );

        CREATE TABLE IF NOT EXISTS pm.tenants (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     VARCHAR(36) NOT NULL UNIQUE,
            name        VARCHAR(200) NOT NULL,
            email       VARCHAR(200) NOT NULL,
            phone       VARCHAR(50),
            id_document VARCHAR(500),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS pm.leases (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            unit_id         UUID NOT NULL REFERENCES pm.units(id),
            tenant_id       UUID NOT NULL REFERENCES pm.tenants(id),
            start_date      DATE NOT NULL,
            end_date        DATE NOT NULL,
            rent_amount     NUMERIC(14,2) NOT NULL,
            rent_currency   pm.currency_enum NOT NULL,
            deposit_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
            billing_day     INTEGER NOT NULL,
            status          pm.lease_status NOT NULL DEFAULT 'draft',
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS pm.rent_charges (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            lease_id    UUID NOT NULL REFERENCES pm.leases(id),
            period      DATE NOT NULL,
            amount_due  NUMERIC(14,2) NOT NULL,
            currency    pm.currency_enum NOT NULL,
            due_date    DATE NOT NULL,
            amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
            status      pm.charge_status NOT NULL DEFAULT 'due',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS pm.payments (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            charge_id    UUID NOT NULL REFERENCES pm.rent_charges(id),
            amount       NUMERIC(14,2) NOT NULL,
            currency     pm.currency_enum NOT NULL,
            paid_on      DATE NOT NULL,
            method       pm.payment_method_enum NOT NULL,
            recorded_by  VARCHAR(36) NOT NULL,
            receipt_pdf  VARCHAR(500),
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS pm.maintenance_tickets (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            unit_id      UUID NOT NULL REFERENCES pm.units(id),
            reported_by  VARCHAR(36) NOT NULL,
            title        VARCHAR(300) NOT NULL,
            description  TEXT,
            status       pm.ticket_status NOT NULL DEFAULT 'open',
            photos       TEXT[],
            assignee     VARCHAR(36),
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            resolved_at  TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS pm.owner_statements (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            owner_id        UUID NOT NULL REFERENCES pm.owners(id),
            period_start    DATE NOT NULL,
            period_end      DATE NOT NULL,
            rent_collected  NUMERIC(14,2) NOT NULL,
            mgmt_fee        NUMERIC(14,2) NOT NULL,
            net_payout      NUMERIC(14,2) NOT NULL,
            currency        pm.currency_enum NOT NULL,
            pdf             VARCHAR(500),
            sent_at         TIMESTAMPTZ,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)


def downgrade() -> None:
    op.execute("""
        DROP TABLE IF EXISTS pm.owner_statements;
        DROP TABLE IF EXISTS pm.maintenance_tickets;
        DROP TABLE IF EXISTS pm.payments;
        DROP TABLE IF EXISTS pm.rent_charges;
        DROP TABLE IF EXISTS pm.leases;
        DROP TABLE IF EXISTS pm.tenants;
        DROP TABLE IF EXISTS pm.units;
        DROP TABLE IF EXISTS pm.owners;
        DROP TYPE IF EXISTS pm.ticket_status;
        DROP TYPE IF EXISTS pm.payment_method_enum;
        DROP TYPE IF EXISTS pm.charge_status;
        DROP TYPE IF EXISTS pm.currency_enum;
        DROP TYPE IF EXISTS pm.lease_status;
        DROP SCHEMA IF EXISTS pm;
    """)
