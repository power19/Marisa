'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Props {
  locale: string
}

export default function PortalNav({ locale }: Props) {
  const t = useTranslations('portal.nav')
  const pathname = usePathname()

  const links = [
    { href: `/${locale}/portal`, label: t('dashboard') },
    { href: `/${locale}/portal/lease`, label: t('lease') },
    { href: `/${locale}/portal/payments`, label: t('payments') },
    { href: `/${locale}/portal/maintenance`, label: t('maintenance') },
  ]

  return (
    <nav className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-grey-medium uppercase tracking-widest mb-3">
        {t('title')}
      </p>
      {links.map((link) => {
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              active
                ? 'bg-gold text-black'
                : 'text-grey-medium hover:text-black hover:bg-off-white'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
      <LogoutButton locale={locale} />
    </nav>
  )
}

function LogoutButton({ locale }: { locale: string }) {
  const t = useTranslations('portal.nav')

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = `/${locale}/portal/login`
  }

  return (
    <button
      onClick={handleLogout}
      className="mt-6 px-3 py-2 rounded text-sm text-left text-grey-medium hover:text-black hover:bg-off-white transition-colors"
    >
      {t('logout')}
    </button>
  )
}
