'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import LocaleSwitcher from './LocaleSwitcher'

export default function Header() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { href: `/${locale}/search`, label: t('search') },
    { href: `/${locale}/buying`, label: t('buying') },
    { href: `/${locale}/selling`, label: t('selling') },
    { href: `/${locale}/renting`, label: t('renting') },
    { href: `/${locale}/expat`, label: t('expat') },
    { href: `/${locale}/about`, label: t('about') },
    { href: `/${locale}/contact`, label: t('contact') },
    { href: `/${locale}/portal`, label: t('portal') },
  ]

  return (
    <header className="bg-black text-white sticky top-0 z-50 shadow-overlay">
      <div className="container-site flex items-center justify-between h-16">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-3">
          <span className="font-display text-xl tracking-wide text-white">
            Far East
          </span>
          <span className="hidden sm:block text-grey-medium text-xs tracking-wider uppercase">
            Property Management
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium tracking-wide text-grey-light hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <LocaleSwitcher />
        </nav>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-2 text-white"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="lg:hidden bg-charcoal border-t border-grey-medium px-6 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm text-grey-light hover:text-white transition-colors py-1"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-grey-medium">
            <LocaleSwitcher />
          </div>
        </nav>
      )}
    </header>
  )
}
