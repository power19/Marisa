'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface InquiryFormProps {
  listingId: string
  onSuccess?: () => void
}

export default function InquiryForm({ listingId, onSuccess }: InquiryFormProps) {
  const t = useTranslations('common')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, listing_id: listingId }),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('success')
      setForm({ name: '', email: '', phone: '', message: '' })
      if (onSuccess) setTimeout(onSuccess, 1500) // close modal after showing success
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="p-4 bg-blue/10 border border-accent text-accent rounded-md text-sm">
        {t('successMessage')}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
          {t('name')} <span className="text-accent">*</span>
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
          {t('email')} <span className="text-accent">*</span>
        </label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
          {t('phone')}
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
          {t('message')} <span className="text-accent">*</span>
        </label>
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-accent resize-none"
        />
      </div>
      {status === 'error' && (
        <p className="text-sm text-red-600">{t('errorMessage')}</p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="btn btn-primary disabled:opacity-60"
      >
        {status === 'sending' ? t('sending') : t('submit')}
      </button>
    </form>
  )
}
