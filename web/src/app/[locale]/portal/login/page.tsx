import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { getToken } from '@/lib/auth/session'
import LoginForm from '@/components/portal/LoginForm'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'portal.login' })
  return { title: t('title') }
}

export default async function PortalLoginPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale)

  // Already logged in — send to dashboard
  if (getToken()) {
    redirect(`/${locale}/portal`)
  }

  const t = await getTranslations({ locale, namespace: 'portal.login' })

  return (
    <div className="container-site py-16">
      <div className="max-w-md mx-auto">
        <div className="divider-brand" />
        <h1 className="text-h1 font-display mb-2">{t('title')}</h1>
        <p className="text-grey-medium mb-8">{t('subtitle')}</p>
        <LoginForm locale={locale} />
      </div>
    </div>
  )
}
