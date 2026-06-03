import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'pages.buying' })
  return { title: t('title'), description: t('description') }
}

export default async function BuyingPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'pages.buying' })

  const steps = [
    { num: '01', title: t('step1'), text: t('step1Text') },
    { num: '02', title: t('step2'), text: t('step2Text') },
    { num: '03', title: t('step3'), text: t('step3Text') },
    { num: '04', title: t('step4'), text: t('step4Text') },
  ]

  return (
    <div className="container-site py-16">
      <div className="max-w-3xl mb-16">
        <div className="divider-brand" />
        <h1 className="text-h1 font-display mb-6">{t('title')}</h1>
        <p className="text-lg text-grey-medium">{t('description')}</p>
      </div>

      <div className="mb-16">
        <h2 className="text-h2 font-display mb-10">{t('steps')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {steps.map((step) => (
            <div key={step.num} className="border border-grey-light p-6">
              <p className="text-h1 font-display text-grey-light mb-2">{step.num}</p>
              <h3 className="text-h3 font-display mb-2">{step.title}</h3>
              <p className="text-sm text-grey-medium leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <Link href={`/${locale}/search?offer_type=sale`} className="btn btn-primary">
          Browse Properties for Sale
        </Link>
        <Link href={`/${locale}/contact`} className="btn btn-ghost">
          Talk to an Agent
        </Link>
      </div>
    </div>
  )
}
