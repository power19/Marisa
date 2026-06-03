import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'pages.account' })
  return { title: t('title'), description: t('description') }
}

export default async function AccountPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'pages.account' })

  return (
    <div className="container-site py-16">
      <div className="max-w-xl">
        <div className="divider-brand" />
        <h1 className="text-h1 font-display mb-6">{t('title')}</h1>
        <p className="text-grey-medium">{t('comingSoon')}</p>
      </div>
    </div>
  )
}
