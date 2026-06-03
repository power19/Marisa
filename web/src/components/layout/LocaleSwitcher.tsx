'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { locales } from '@/lib/i18n/config'

const localeLabels: Record<string, string> = {
  en: 'EN',
  nl: 'NL',
  srn: 'SRN',
}

export default function LocaleSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()

  // Strip current locale prefix from path to build new locale paths
  function buildHref(targetLocale: string) {
    // pathname starts with /[locale]/...
    const segments = pathname.split('/')
    segments[1] = targetLocale
    return segments.join('/')
  }

  return (
    <div className="flex items-center gap-2">
      {locales.map((loc) => (
        <Link
          key={loc}
          href={buildHref(loc)}
          className={`text-xs tracking-wider uppercase transition-colors ${
            loc === locale
              ? 'text-white font-semibold'
              : 'text-grey-medium hover:text-white'
          }`}
        >
          {localeLabels[loc]}
        </Link>
      ))}
    </div>
  )
}
