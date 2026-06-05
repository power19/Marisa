'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Props {
  locale: string
}

export default function LoginForm({ locale }: Props) {
  const t = useTranslations('portal.login')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? t('errorInvalid'))
        return
      }
      router.push(`/${locale}/portal`)
      router.refresh()
    } catch {
      setError(t('errorNetwork'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </p>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">{t('email')}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-grey-medium rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t('password')}</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-grey-medium rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-primary disabled:opacity-50"
      >
        {loading ? t('signingIn') : t('signIn')}
      </button>
    </form>
  )
}
