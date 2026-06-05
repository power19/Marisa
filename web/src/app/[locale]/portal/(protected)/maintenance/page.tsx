import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { getToken } from '@/lib/auth/session'
import { pmFetch } from '@/lib/pm/client'
import type { MaintenanceTicket } from '@/lib/pm/types'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'portal.maintenance' })
  return { title: t('title') }
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  on_hold: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-grey-light text-grey-medium',
}

export default async function MaintenancePage({ params: { locale } }: PageProps) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'portal.maintenance' })
  const token = getToken()!

  const tickets = await pmFetch<MaintenanceTicket[]>('/portal/tickets', token).catch(
    () => [] as MaintenanceTicket[],
  )

  const sorted = [...tickets].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h2 font-display">{t('title')}</h1>
        <Link href={`/${locale}/portal/maintenance/new`} className="btn-primary">
          {t('newTicket')}
        </Link>
      </div>

      {sorted.length === 0 ? (
        <p className="text-grey-medium">{t('noTickets')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((ticket) => (
            <div key={ticket.id} className="border border-grey-light rounded-lg p-5 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{ticket.title}</p>
                  {ticket.description && (
                    <p className="text-sm text-grey-medium mt-1 line-clamp-2">
                      {ticket.description}
                    </p>
                  )}
                  <p className="text-xs text-grey-medium mt-2">
                    {new Date(ticket.created_at).toLocaleDateString()}
                    {ticket.resolved_at && (
                      <> &mdash; {t('resolvedOn', { date: new Date(ticket.resolved_at).toLocaleDateString() })}</>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded uppercase whitespace-nowrap ${STATUS_COLORS[ticket.status] ?? ''}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
              {ticket.photos && ticket.photos.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {ticket.photos.map((key, i) => (
                    <a
                      key={key}
                      href={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? ''}/${key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gold hover:underline"
                    >
                      {t('photo', { n: i + 1 })}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
