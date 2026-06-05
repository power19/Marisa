import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getToken } from '@/lib/auth/session'
import { pmFetch } from '@/lib/pm/client'
import type { RentCharge, Payment } from '@/lib/pm/types'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'portal.payments' })
  return { title: t('title') }
}

const CHARGE_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  due: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-700',
  waived: 'bg-grey-light text-grey-medium',
}

export default async function PaymentsPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'portal.payments' })
  const token = getToken()!

  const [charges, payments] = await Promise.all([
    pmFetch<RentCharge[]>('/portal/charges', token).catch(() => [] as RentCharge[]),
    pmFetch<Payment[]>('/portal/payments', token).catch(() => [] as Payment[]),
  ])

  const paymentsByCharge = payments.reduce<Record<string, Payment[]>>((acc, p) => {
    ;(acc[p.charge_id] ??= []).push(p)
    return acc
  }, {})

  const sorted = [...charges].sort(
    (a, b) => new Date(b.period).getTime() - new Date(a.period).getTime(),
  )

  return (
    <div>
      <h1 className="text-h2 font-display mb-6">{t('title')}</h1>

      {sorted.length === 0 ? (
        <p className="text-grey-medium">{t('noCharges')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map((charge) => {
            const pmts = paymentsByCharge[charge.id] ?? []
            return (
              <div key={charge.id} className="border border-grey-light rounded-lg bg-white overflow-hidden">
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-grey-light">
                  <div>
                    <p className="font-semibold">
                      {t('period', { period: charge.period })}
                    </p>
                    <p className="text-sm text-grey-medium">
                      {t('due', { date: charge.due_date })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {charge.currency} {Number(charge.amount_due).toFixed(2)}
                    </p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${CHARGE_STATUS_COLORS[charge.status] ?? ''}`}>
                      {charge.status}
                    </span>
                  </div>
                </div>

                {pmts.length > 0 && (
                  <div className="px-5 py-3">
                    <p className="text-xs text-grey-medium uppercase tracking-wide mb-2">
                      {t('payments')}
                    </p>
                    {pmts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm py-1">
                        <span>
                          {p.paid_on} — {p.method}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">
                            {p.currency} {Number(p.amount).toFixed(2)}
                          </span>
                          {p.receipt_pdf && (
                            <a
                              href={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? ''}/${p.receipt_pdf}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gold hover:underline text-xs"
                            >
                              {t('receipt')}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
