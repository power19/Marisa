"""create pm schema and tables

Revision ID: 0001
Revises:
Create Date: 2026-06-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS pm")

    # Enums
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE pm.lease_status AS ENUM ('draft','active','ended','terminated');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE pm.charge_status AS ENUM ('due','partial','paid','overdue','waived');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE pm.currency_enum AS ENUM ('USD','EUR','SRD');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE pm.payment_method_enum AS ENUM ('cash','bank','other');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE pm.ticket_status AS ENUM ('open','in_progress','on_hold','resolved','closed');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    # owners
    op.create_table(
        "owners",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(50)),
        sa.Column("payout_notes", sa.Text),
        schema="pm",
    )

    # units
    op.create_table(
        "units",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("listing_id", sa.String(36)),
        sa.Column("owner_id", UUID(as_uuid=True), sa.ForeignKey("pm.owners.id"), nullable=False),
        sa.Column("label", sa.String(200), nullable=False),
        sa.Column("address", sa.Text),
        sa.Column("notes", sa.Text),
        schema="pm",
    )

    # tenants
    op.create_table(
        "tenants",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(50)),
        sa.Column("id_document", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="pm",
    )

    # leases
    op.create_table(
        "leases",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("unit_id", UUID(as_uuid=True), sa.ForeignKey("pm.units.id"), nullable=False),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("pm.tenants.id"), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("rent_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("rent_currency", sa.Enum("USD", "EUR", "SRD", name="currency_enum", schema="pm", create_type=False), nullable=False),
        sa.Column("deposit_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("billing_day", sa.Integer, nullable=False),
        sa.Column("status", sa.Enum("draft", "active", "ended", "terminated", name="lease_status", schema="pm", create_type=False), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="pm",
    )

    # rent_charges
    op.create_table(
        "rent_charges",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("lease_id", UUID(as_uuid=True), sa.ForeignKey("pm.leases.id"), nullable=False),
        sa.Column("period", sa.Date, nullable=False),
        sa.Column("amount_due", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.Enum("USD", "EUR", "SRD", name="currency_enum", schema="pm", create_type=False), nullable=False),
        sa.Column("due_date", sa.Date, nullable=False),
        sa.Column("amount_paid", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.Enum("due", "partial", "paid", "overdue", "waived", name="charge_status", schema="pm", create_type=False), nullable=False, server_default="due"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="pm",
    )

    # payments
    op.create_table(
        "payments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("charge_id", UUID(as_uuid=True), sa.ForeignKey("pm.rent_charges.id"), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.Enum("USD", "EUR", "SRD", name="currency_enum", schema="pm", create_type=False), nullable=False),
        sa.Column("paid_on", sa.Date, nullable=False),
        sa.Column("method", sa.Enum("cash", "bank", "other", name="payment_method_enum", schema="pm", create_type=False), nullable=False),
        sa.Column("recorded_by", sa.String(36), nullable=False),
        sa.Column("receipt_pdf", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="pm",
    )

    # maintenance_tickets
    op.create_table(
        "maintenance_tickets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("unit_id", UUID(as_uuid=True), sa.ForeignKey("pm.units.id"), nullable=False),
        sa.Column("reported_by", sa.String(36), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("status", sa.Enum("open", "in_progress", "on_hold", "resolved", "closed", name="ticket_status", schema="pm", create_type=False), nullable=False, server_default="open"),
        sa.Column("photos", ARRAY(sa.String)),
        sa.Column("assignee", sa.String(36)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        schema="pm",
    )

    # owner_statements
    op.create_table(
        "owner_statements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", UUID(as_uuid=True), sa.ForeignKey("pm.owners.id"), nullable=False),
        sa.Column("period_start", sa.Date, nullable=False),
        sa.Column("period_end", sa.Date, nullable=False),
        sa.Column("rent_collected", sa.Numeric(14, 2), nullable=False),
        sa.Column("mgmt_fee", sa.Numeric(14, 2), nullable=False),
        sa.Column("net_payout", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.Enum("USD", "EUR", "SRD", name="currency_enum", schema="pm", create_type=False), nullable=False),
        sa.Column("pdf", sa.String(500)),
        sa.Column("sent_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="pm",
    )


def downgrade() -> None:
    for tbl in ["owner_statements", "maintenance_tickets", "payments", "rent_charges", "leases", "tenants", "units", "owners"]:
        op.drop_table(tbl, schema="pm")
    for enum in ["ticket_status", "payment_method_enum", "charge_status", "currency_enum", "lease_status"]:
        op.execute(f"DROP TYPE IF EXISTS pm.{enum}")
    op.execute("DROP SCHEMA IF EXISTS pm")
