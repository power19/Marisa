import { getRequestConfig } from 'next-intl/server'
import { locales, defaultLocale, type Locale } from './config'

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale: Locale = locales.includes(locale as Locale)
    ? (locale as Locale)
    : defaultLocale

  const messages = (await import(`../../../messages/${resolvedLocale}.json`)).default

  return {
    locale: resolvedLocale,
    messages,
  }
})
