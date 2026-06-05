export interface Lease {
  id: string
  unit_id: string
  tenant_id: string
  start_date: string
  end_date: string
  rent_amount: string
  rent_currency: 'USD' | 'EUR' | 'SRD'
  deposit_amount: string
  billing_day: number
  status: 'draft' | 'active' | 'ended' | 'terminated'
  created_at: string
}

export interface RentCharge {
  id: string
  lease_id: string
  period: string
  amount_due: string
  currency: 'USD' | 'EUR' | 'SRD'
  due_date: string
  amount_paid: string
  status: 'due' | 'partial' | 'paid' | 'overdue' | 'waived'
  created_at: string
}

export interface Payment {
  id: string
  charge_id: string
  amount: string
  currency: 'USD' | 'EUR' | 'SRD'
  paid_on: string
  method: 'cash' | 'bank' | 'other'
  recorded_by: string
  receipt_pdf: string | null
  created_at: string
}

export interface MaintenanceTicket {
  id: string
  unit_id: string
  reported_by: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed'
  photos: string[] | null
  assignee: string | null
  created_at: string
  resolved_at: string | null
}
