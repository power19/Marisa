import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import InquiryForm from '@/components/contact/InquiryForm'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'pages.contact' })
  return { title: t('title'), description: t('description') }
}

export default async function ContactPage({ params: { locale } }: PageProps) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'pages.contact' })
  const tf = await getTranslations({ locale, namespace: 'footer' })

  return (
    <div className="container-site py-16">
      <div className="max-w-3xl mb-12">
        <div className="divider-brand" />
        <h1 className="text-h1 font-display mb-6">{t('title')}</h1>
        <p className="text-lg text-grey-medium">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-h3 font-display mb-6">{t('sendMessage')}</h2>
          {/* Using listing_id = '' for general inquiries */}
          <InquiryForm listingId="general" />
        </div>

        <div>
          <h2 className="text-h3 font-display mb-6">{t('office')}</h2>
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <p className="text-xs tracking-wider uppercase text-grey-medium mb-1">Address</p>
              <p>{tf('address')}</p>
            </div>
            <div>
              <p className="text-xs tracking-wider uppercase text-grey-medium mb-1">Email</p>
              <a href={`mailto:${tf('email')}`} className="text-accent hover:text-accent-hover transition-colors">
                {tf('email')}
              </a>
            </div>
            <div>
              <p className="text-xs tracking-wider uppercase text-grey-medium mb-1">Phone</p>
              <a href={`tel:${tf('phone')}`} className="hover:text-accent transition-colors">
                {tf('phone')}
              </a>
            </div>
            <div className="pt-4">
              <a
                href={`https://wa.me/${tf('phone').replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost text-sm"
              >
                {t('whatsappUs')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
