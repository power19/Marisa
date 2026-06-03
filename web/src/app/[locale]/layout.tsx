import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { locales } from '@/lib/i18n/config'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import '@/styles/globals.css'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export const metadata: Metadata = {
  title: {
    template: '%s | Far East Property Management',
    default: 'Far East Property Management — Real Estate in Suriname',
  },
  description:
    'Find residential, commercial, and investment properties for sale and rent across Suriname.',
}

interface LocaleLayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: LocaleLayoutProps) {
  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className="bg-off-white font-body text-black min-h-screen flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="flex-1">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-24 text-grey-medium">
                  Loading...
                </div>
              }
            >
              {children}
            </Suspense>
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
