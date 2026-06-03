import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './lib/i18n/config'

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

export const config = {
  // Match all paths except Next.js internals and static files
  matcher: ['/((?!_next|_vercel|api|.*\\..*).*)'],
}
