export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import SearchWidget from '@/components/search/SearchWidget'
import ListingGrid from '@/components/listing/ListingGrid'
import { getFeaturedListings, getNewListings, getListingsByOfferType } from '@/lib/directus/listings'
import { getServerTheme } from '@/lib/theme/ThemeProvider'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    title: t('homeTitle'),
    description: t('homeDescription'),
    alternates: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      languages: { en: '/en', nl: '/nl' },
    },
  }
}

export default async function HomePage({ params: { locale } }: PageProps) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'listing' })
  const th = await getTranslations({ locale, namespace: 'hero' })
  const tj = await getTranslations({ locale, namespace: 'journey' })

  const [newListings, featuredListings, forSale, forRent] = await Promise.allSettled([
    getNewListings(),
    getFeaturedListings(),
    getListingsByOfferType('sale', 3),
    getListingsByOfferType('rent', 3),
  ])

  const newListingsData = newListings.status === 'fulfilled' ? newListings.value : []
  const featuredListingsData = featuredListings.status === 'fulfilled' ? featuredListings.value : []
  const forSaleData = forSale.status === 'fulfilled' ? forSale.value : []
  const forRentData = forRent.status === 'fulfilled' ? forRent.value : []

  const theme = getServerTheme()
  const heroClasses = [
    'bg-black text-white py-24 relative overflow-hidden',
    theme?.heroClass,
    theme?.decoration ? theme.decorationClass : null,
  ].filter(Boolean).join(' ')

  return (
    <>
      {/* Hero */}
      <section className={heroClasses}>
        <div className="container-site relative z-10">
          <p className="text-xs tracking-wider uppercase text-grey-medium mb-4">
            Far East Property Management
          </p>
          <h1 className="text-hero font-display font-light mb-6 max-w-3xl">
            {th('title')}
          </h1>
          <p className="text-lg text-grey-medium max-w-xl mb-10">{th('subtitle')}</p>
          <Suspense fallback={null}>
            <SearchWidget />
          </Suspense>
        </div>
        {/* Decorative blue accent */}
        <div className="absolute bottom-0 left-0 w-48 h-1 bg-accent" />
      </section>

      {/* New listings */}
      {newListingsData.length > 0 && (
        <section className="container-site py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="divider-brand" />
              <h2 className="text-h2 font-display">{t('newListings')}</h2>
            </div>
            <Link href={`/${locale}/search?sort=newest`} className="btn btn-ghost text-sm">
              {t('viewAll')}
            </Link>
          </div>
          <ListingGrid listings={newListingsData} />
        </section>
      )}

      {/* Featured listings */}
      {featuredListingsData.length > 0 && (
        <section className="bg-off-white py-16">
          <div className="container-site">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="divider-brand" />
                <h2 className="text-h2 font-display">{t('featuredListings')}</h2>
              </div>
              <Link href={`/${locale}/search?featured=1`} className="btn btn-ghost text-sm">
                {t('viewAll')}
              </Link>
            </div>
            <ListingGrid listings={featuredListingsData} />
          </div>
        </section>
      )}

      {/* For Sale */}
      {forSaleData.length > 0 && (
        <section className="container-site py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="divider-brand" />
              <h2 className="text-h2 font-display">{t('forSale')}</h2>
            </div>
            <Link href={`/${locale}/search?offer_type=sale`} className="btn btn-ghost text-sm">
              {t('viewAll')}
            </Link>
          </div>
          <ListingGrid listings={forSaleData} />
        </section>
      )}

      {/* For Rent */}
      {forRentData.length > 0 && (
        <section className="bg-off-white py-16">
          <div className="container-site">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="divider-brand" />
                <h2 className="text-h2 font-display">{t('forRent')}</h2>
              </div>
              <Link href={`/${locale}/search?offer_type=rent`} className="btn btn-ghost text-sm">
                {t('viewAll')}
              </Link>
            </div>
            <ListingGrid listings={forRentData} />
          </div>
        </section>
      )}

      {/* Your Journey */}
      <section className="bg-black text-white py-20">
        <div className="container-site">
          <div className="text-center mb-12">
            <div className="divider-brand mx-auto" />
            <h2 className="text-h2 font-display mb-4">{tj('title')}</h2>
            <p className="text-grey-medium max-w-2xl mx-auto">{tj('subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {([
              { key: 'buy', href: `/${locale}/buying` },
              { key: 'sell', href: `/${locale}/selling` },
              { key: 'rent', href: `/${locale}/renting` },
            ] as const).map(({ key, href }) => (
              <Link
                key={key}
                href={href}
                className="group border border-charcoal hover:border-accent p-8 transition-colors"
              >
                <h3 className="text-h2 font-display mb-3 group-hover:text-accent transition-colors">
                  {tj(`${key}.title`)}
                </h3>
                <p className="text-sm text-grey-medium mb-6">{tj(`${key}.description`)}</p>
                <span className="text-xs tracking-wider uppercase text-accent">Learn More →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact teaser */}
      <section className="container-site py-20 text-center">
        <div className="divider-brand mx-auto" />
        <h2 className="text-h2 font-display mb-4">Ready to Get Started?</h2>
        <p className="text-grey-medium mb-8 max-w-lg mx-auto">
          Our team of experienced agents is here to guide you through every step.
        </p>
        <Link href={`/${locale}/contact`} className="btn btn-primary">
          Get in Touch
        </Link>
      </section>
    </>
  )
}
