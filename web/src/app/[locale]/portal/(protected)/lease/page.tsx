import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getToken } from '@/lib/auth/session'
import { pmFetch } from '@/lib/pm/client'
import type { Lease } from '@/lib/pm/types'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'portal.lease' })
  return { title: t('title') }
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-yellow-100 text-yellow-800',
  ended: 'bg-grey-light text-grey-medium',
  terminated: 'bg-red-100 text-red-700',
}

export default async function LeaseePage({ params: { locale } }: PageProps) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'portal.lease' })
  const token = getToken()!

  const leases = await pmFetch<Lease[]>('/portal/lease', token).catch(() => [] as Lease[])

  if (leases.length === 0) {
    return (
      <div>
        <h1 className="text-h2 font-display mb-6">{t('title')}</h1>
        <p className="text-grey-medium">{t('noLeases')}</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-h2 font-display mb-6">{t('title')}</h1>
      <div className="flex flex-col gap-6">
        {leases.map((lease) => (
          <div key={lease.id} className="border border-grey-light rounded-lg p-6 bg-white">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="font-semibold text-lg">{t('leaseId', { id: lease.id.slice(0, 8) })}</h2>
              <span className={`text-xs font-semibold px-2 py-1 rounded uppercase ${STATUS_COLORS[lease.status] ?? ''}`}>
                {lease.status}
              </span>
            </div>
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <Row label={t('startDate')} value={lease.start_date} />
              <Row label={t('endDate')} value={lease.end_date} />
              <Row label={t('rent')} value={`${lease.rent_currency} ${Number(lease.rent_amount).toFixed(2)}`} />
              <Row label={t('deposit')} value={`${lease.rent_currency} ${Number(lease.deposit_amount).toFixed(2)}`} />
              <Row label={t('billingDay')} value={t('billingDayValue', { day: lease.billing_day })} />
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-grey-medium">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
