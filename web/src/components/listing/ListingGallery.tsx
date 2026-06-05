'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { ListingMedia } from '@/types/listing'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? ''

interface ListingGalleryProps {
  media: ListingMedia[]
  title: string
}

export default function ListingGallery({ media, title }: ListingGalleryProps) {
  const photos = media.filter((m) => m.kind === 'photo')
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (photos.length === 0) {
    return (
      <div className="aspect-[16/9] bg-grey-light flex items-center justify-center text-grey-medium rounded-md">
        <span>No photos available</span>
      </div>
    )
  }

  const active = photos[activeIndex]

  return (
    <div>
      {/* Main image */}
      <div
        className="relative aspect-[16/9] rounded-md overflow-hidden cursor-pointer mb-3"
        onClick={() => setLightboxOpen(true)}
      >
        <Image
          src={`${DIRECTUS_URL}/assets/${active.file}`}
          alt={active.alt ?? title}
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 800px"
          className="object-cover"
        />
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-sm">
            {activeIndex + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setActiveIndex(i)}
              className={`flex-shrink-0 relative w-20 h-16 rounded-sm overflow-hidden border-2 transition-colors ${
                i === activeIndex ? 'border-accent' : 'border-transparent'
              }`}
            >
              <Image
                src={`${DIRECTUS_URL}/assets/${photo.file}`}
                alt={photo.alt ?? `Photo ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {activeIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2"
              onClick={(e) => { e.stopPropagation(); setActiveIndex((i) => i - 1) }}
              aria-label="Previous"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div
            className="relative w-full max-w-4xl aspect-[16/9]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={`${DIRECTUS_URL}/assets/${active.file}`}
              alt={active.alt ?? title}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
          {activeIndex < photos.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2"
              onClick={(e) => { e.stopPropagation(); setActiveIndex((i) => i + 1) }}
              aria-label="Next"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
