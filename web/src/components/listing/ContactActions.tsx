'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import InquiryForm from '@/components/contact/InquiryForm'
import ViewingRequestForm from '@/components/contact/ViewingRequestForm'

type ModalType = 'inquiry' | 'viewing' | null

interface ContactActionsProps {
  listingId: string
  listingSlug: string
}

export default function ContactActions({ listingId, listingSlug }: ContactActionsProps) {
  const t = useTranslations('listing')
  const [open, setOpen] = useState<ModalType>(null)

  return (
    <>
      {/* Buttons */}
      <div className="flex flex-col gap-3 mb-6">
        <button
          onClick={() => setOpen('inquiry')}
          className="btn btn-primary w-full justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {t('contactAgent')}
        </button>
        <button
          onClick={() => setOpen('viewing')}
          className="btn btn-ghost w-full justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {t('requestViewing')}
        </button>
      </div>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-md shadow-overlay max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-grey-light">
              <h2 className="text-h3 font-display">
                {open === 'inquiry' ? t('contactAgent') : t('requestViewing')}
              </h2>
              <button
                onClick={() => setOpen(null)}
                className="text-grey-medium hover:text-black transition-colors p-1"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6">
              {open === 'inquiry' ? (
                <InquiryForm
                  listingId={listingId}
                  onSuccess={() => setOpen(null)}
                />
              ) : (
                <ViewingRequestForm
                  listingId={listingId}
                  onSuccess={() => setOpen(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
