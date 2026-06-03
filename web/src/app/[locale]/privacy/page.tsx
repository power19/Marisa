import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'pages.privacy' })
  return { title: t('title'), description: t('description') }
}

export default async function PrivacyPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'pages.privacy' })

  return (
    <div className="container-site py-16">
      <div className="max-w-3xl">
        <div className="divider-brand" />
        <h1 className="text-h1 font-display mb-2">{t('title')}</h1>
        <p className="text-xs text-grey-medium mb-10 tracking-wider uppercase">
          {t('lastUpdated')}: June 2026
        </p>

        <div className="prose prose-sm max-w-none space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-h3 font-display mb-3">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us when you submit inquiry forms,
              viewing requests, or create an account. This includes your name, email address,
              phone number, and any messages you send.
            </p>
          </section>
          <section>
            <h2 className="text-h3 font-display mb-3">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to respond to your inquiries, schedule viewings,
              and improve our services. We do not sell your personal information to third parties.
            </p>
          </section>
          <section>
            <h2 className="text-h3 font-display mb-3">3. Data Retention</h2>
            <p>
              We retain your personal data for as long as necessary to fulfill the purposes for
              which it was collected, or as required by applicable law.
            </p>
          </section>
          <section>
            <h2 className="text-h3 font-display mb-3">4. Contact</h2>
            <p>
              If you have questions about this privacy policy, please contact us at
              info@fareastproperties.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
