import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getToken } from '@/lib/auth/session'
import { pmFetch } from '@/lib/pm/client'
import type { Lease } from '@/lib/pm/types'
import NewTicketForm from '@/components/portal/NewTicketForm'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'portal.maintenance.form' })
  return { title: t('title') }
}

export default async function NewTicketPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'portal.maintenance.form' })
  const token = getToken()!

  const leases = await pmFetch<Lease[]>('/portal/lease', token).catch(() => [] as Lease[])

  return (
    <div>
      <h1 className="text-h2 font-display mb-6">{t('title')}</h1>
      <NewTicketForm locale={locale} leases={leases} />
    </div>
  )
}
