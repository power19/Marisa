'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Props {
  locale: string
  leases: Array<{ id: string; unit_id: string; status: string }>
}

export default function NewTicketForm({ locale, leases }: Props) {
  const t = useTranslations('portal.maintenance.form')
  const router = useRouter()

  const activeLeases = leases.filter((l) => l.status === 'active')

  const [unitId, setUnitId] = useState(activeLeases[0]?.unit_id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Create the ticket
      const res = await fetch('/api/portal/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit_id: unitId, title, description: description || null }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.detail ?? t('error'))
        return
      }

      const ticket = await res.json()

      // 2. Upload photos if any
      if (files && files.length > 0) {
        const formData = new FormData()
        for (const file of Array.from(files)) {
          formData.append('files', file)
        }
        await fetch(`/api/portal/tickets/${ticket.id}/photos`, {
          method: 'POST',
          body: formData,
        })
      }

      router.push(`/${locale}/portal/maintenance`)
      router.refresh()
    } catch {
      setError(t('errorNetwork'))
    } finally {
      setLoading(false)
    }
  }

  if (activeLeases.length === 0) {
    return <p className="text-grey-medium">{t('noActiveLease')}</p>
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
      {error && (
        <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">{t('unit')}</label>
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="w-full border border-grey-medium rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        >
          {activeLeases.map((l) => (
            <option key={l.id} value={l.unit_id}>
              {l.unit_id}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('issueTitle')}</label>
        <input
          type="text"
          required
          maxLength={300}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-grey-medium rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('description')}</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-grey-medium rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-y"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('photos')}</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="w-full text-sm"
        />
        <p className="text-xs text-grey-medium mt-1">{t('photosHint')}</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? t('submitting') : t('submit')}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-grey-medium hover:text-black transition-colors"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}
