'use client'

import { useEffect, useRef } from 'react'
import type maplibregl from 'maplibre-gl'

interface ListingMapProps {
  lat: number
  lng: number
  title: string
}

export default function ListingMap({ lat, lng, title }: ListingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    let map: maplibregl.Map
    let marker: maplibregl.Marker

    import('maplibre-gl').then((maplibre) => {
      const MapLibre = maplibre.default

      map = new MapLibre.Map({
        container: mapContainer.current!,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
        center: [lng, lat],
        zoom: 14,
      })

      marker = new MapLibre.Marker({ color: '#1B3A8C' })
        .setLngLat([lng, lat])
        .setPopup(new MapLibre.Popup().setText(title))
        .addTo(map)

      mapRef.current = map
    })

    return () => {
      marker?.remove()
      map?.remove()
      mapRef.current = null
    }
  }, [lat, lng, title])

  return (
    <div>
      <link
        href="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css"
        rel="stylesheet"
      />
      <div
        ref={mapContainer}
        className="w-full h-64 rounded-md overflow-hidden"
        aria-label={`Map showing location of ${title}`}
      />
    </div>
  )
}
