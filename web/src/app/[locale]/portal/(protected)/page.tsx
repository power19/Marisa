import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { getToken } from '@/lib/auth/session'
import { pmFetch } from '@/lib/pm/client'
import type { Lease, RentCharge, MaintenanceTicket } from '@/lib/pm/types'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'portal.dashboard' })
  return { title: t('title') }
}

export default async function PortalDashboard({ params: { locale } }: PageProps) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'portal.dashboard' })
  const token = getToken()!

  const [leases, charges, tickets] = await Promise.all([
    pmFetch<Lease[]>('/portal/lease', token).catch(() => [] as Lease[]),
    pmFetch<RentCharge[]>('/portal/charges', token).catch(() => [] as RentCharge[]),
    pmFetch<MaintenanceTicket[]>('/portal/tickets', token).catch(() => [] as MaintenanceTicket[]),
  ])

  const activeLeases = leases.filter((l) => l.status === 'active')
  const overdueCharges = charges.filter((c) => c.status === 'overdue')
  const openTickets = tickets.filter((tk) => tk.status === 'open' || tk.status === 'in_progress')

  const cards = [
    {
      href: `/${locale}/portal/lease`,
      label: t('leases'),
      value: activeLeases.length,
      note: t('activeLeases'),
    },
    {
      href: `/${locale}/portal/payments`,
      label: t('charges'),
      value: overdueCharges.length,
      note: t('overdueCharges'),
      warn: overdueCharges.length > 0,
    },
    {
      href: `/${locale}/portal/maintenance`,
      label: t('tickets'),
      value: openTickets.length,
      note: t('openTickets'),
    },
  ]

  return (
    <div>
      <h1 className="text-h2 font-display mb-6">{t('title')}</h1>
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`block border rounded-lg p-5 hover:shadow-md transition-shadow ${
              card.warn ? 'border-red-300 bg-red-50' : 'border-grey-light bg-white'
            }`}
          >
            <p className="text-xs text-grey-medium uppercase tracking-wide mb-1">{card.label}</p>
            <p className={`text-3xl font-display font-bold mb-1 ${card.warn ? 'text-red-600' : ''}`}>
              {card.value}
            </p>
            <p className="text-sm text-grey-medium">{card.note}</p>
          </Link>
        ))}
      </div>

      <div className="flex gap-4">
        <Link href={`/${locale}/portal/maintenance/new`} className="btn-primary">
          {t('submitTicket')}
        </Link>
      </div>
    </div>
  )
}
