import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'pages.selling' })
  return { title: t('title'), description: t('description') }
}

export default async function SellingPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'pages.selling' })

  return (
    <div className="container-site py-16">
      <div className="max-w-3xl mb-16">
        <div className="divider-brand" />
        <h1 className="text-h1 font-display mb-6">{t('title')}</h1>
        <p className="text-lg text-grey-medium">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {[
          { title: t('valuation'), text: t('valuationText') },
          { title: t('marketing'), text: t('marketingText') },
          { title: t('negotiation'), text: t('negotiationText') },
        ].map((item) => (
          <div key={item.title} className="border border-grey-light p-6">
            <div className="divider-brand mb-4" />
            <h3 className="text-h3 font-display mb-3">{item.title}</h3>
            <p className="text-sm text-grey-medium leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>

      <Link href={`/${locale}/contact`} className="btn btn-primary">
        {t('cta')}
      </Link>
    </div>
  )
}
