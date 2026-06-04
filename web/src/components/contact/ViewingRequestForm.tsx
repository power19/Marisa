'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface ViewingRequestFormProps {
  listingId: string
  onSuccess?: () => void
}

export default function ViewingRequestForm({ listingId, onSuccess }: ViewingRequestFormProps) {
  const t = useTranslations('common')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    preferred_date: '',
    preferred_time: '',
    notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/viewing-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, listing_id: listingId }),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('success')
      if (onSuccess) setTimeout(onSuccess, 1500)
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="p-4 bg-blue/10 border border-blue text-blue rounded-md text-sm">
        {t('successMessage')}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
            {t('name')} <span className="text-blue">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue"
          />
        </div>
        <div>
          <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
            {t('email')} <span className="text-blue">*</span>
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
          {t('phone')}
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
            {t('preferredDate')} <span className="text-blue">*</span>
          </label>
          <input
            type="date"
            required
            value={form.preferred_date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setForm((f) => ({ ...f, preferred_date: e.target.value }))}
            className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue"
          />
        </div>
        <div>
          <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
            {t('preferredTime')}
          </label>
          <input
            type="time"
            value={form.preferred_time}
            onChange={(e) => setForm((f) => ({ ...f, preferred_time: e.target.value }))}
            className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs tracking-wider uppercase text-grey-medium mb-1">
          {t('notes')}
        </label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="w-full border border-grey-light px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-blue resize-none"
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
