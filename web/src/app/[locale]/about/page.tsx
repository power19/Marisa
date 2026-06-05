import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'pages.about' })
  return { title: t('title'), description: t('description') }
}

export default async function AboutPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'pages.about' })

  return (
    <div className="container-site py-16">
      <div className="max-w-3xl">
        <div className="divider-brand" />
        <h1 className="text-h1 font-display mb-6">{t('title')}</h1>
        <p className="text-lg text-grey-medium mb-12">{t('description')}</p>

        <div className="mb-12">
          <h2 className="text-h2 font-display mb-4">{t('mission')}</h2>
          <p className="leading-relaxed">{t('missionText')}</p>
        </div>

        <div className="grid grid-cols-3 gap-8 mb-12 border-y border-grey-light py-8">
          <div className="text-center">
            <p className="text-h1 font-display text-accent mb-1">10+</p>
            <p className="text-xs tracking-wider uppercase text-grey-medium">{t('experience')}</p>
          </div>
          <div className="text-center">
            <p className="text-h1 font-display text-accent mb-1">500+</p>
            <p className="text-xs tracking-wider uppercase text-grey-medium">{t('listings')}</p>
          </div>
          <div className="text-center">
            <p className="text-h1 font-display text-accent mb-1">1000+</p>
            <p className="text-xs tracking-wider uppercase text-grey-medium">{t('clients')}</p>
          </div>
        </div>

        <div>
          <h2 className="text-h2 font-display mb-4">{t('whyUs')}</h2>
          <ul className="space-y-3 text-sm leading-relaxed">
            {(['whyPoint1', 'whyPoint2', 'whyPoint3', 'whyPoint4'] as const).map((key) => (
              <li key={key} className="flex items-start gap-2">
                <span className="text-accent mt-1">&#10003;</span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
