import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import LocaleSwitcher from './LocaleSwitcher'

export default async function Footer() {
  const locale = await getLocale()
  const t = await getTranslations('footer')
  const tn = await getTranslations('nav')

  const year = new Date().getFullYear()

  return (
    <footer className="bg-black text-white">
      <div className="container-site py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="font-display text-2xl tracking-wide mb-2">Far East</div>
            <div className="text-xs tracking-wider uppercase text-grey-medium mb-4">
              Property Management
            </div>
            <p className="text-sm text-grey-medium">{t('tagline')}</p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs tracking-wider uppercase text-grey-medium mb-4">Navigation</h4>
            <nav className="flex flex-col gap-2">
              {[
                { href: `/${locale}/search`, label: tn('search') },
                { href: `/${locale}/buying`, label: tn('buying') },
                { href: `/${locale}/selling`, label: tn('selling') },
                { href: `/${locale}/renting`, label: tn('renting') },
                { href: `/${locale}/expat`, label: tn('expat') },
                { href: `/${locale}/about`, label: tn('about') },
                { href: `/${locale}/contact`, label: tn('contact') },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-grey-medium hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs tracking-wider uppercase text-grey-medium mb-4">Contact</h4>
            <div className="flex flex-col gap-2 text-sm text-grey-medium">
              <span>{t('address')}</span>
              <a href={`mailto:${t('email')}`} className="hover:text-white transition-colors">
                {t('email')}
              </a>
              <a href={`tel:${t('phone')}`} className="hover:text-white transition-colors">
                {t('phone')}
              </a>
            </div>
            <div className="mt-4">
              <LocaleSwitcher />
            </div>
          </div>
        </div>

        <div className="border-t border-charcoal pt-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-grey-medium">
          <span>{t('rights', { year })}</span>
          <Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
