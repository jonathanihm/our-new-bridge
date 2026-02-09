"use client"

import 'leaflet/dist/leaflet.css'
import type { MapResource } from '../types'
import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import FoodMapProps from './FoodMapProps'

const containerStyle: React.CSSProperties = { width: '100%', height: '100%' }

function FitBounds({ resources, center, zoom }: { resources: MapResource[]; center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    if (resources && resources.length > 0) {
      const pts = resources
        .map((r) => [Number(r.lat), Number(r.lng)] as [number, number])
        .filter(([lat, lng]) => !Number.isNaN(lat) && !Number.isNaN(lng))
      if (pts.length > 0) {
        const bounds = L.latLngBounds(pts)
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] })
          return
        }
      }
    }
    map.setView(center, zoom)
  }, [map, resources, center, zoom])
  return null
}

export default function FoodMapLeaflet({ resources, onSelectResource, cityConfig }: FoodMapProps) {
  const center: [number, number] = [cityConfig.map.centerLat, cityConfig.map.centerLng]
  const zoom = cityConfig.map.defaultZoom

  if (!cityConfig.map) throw new Error('cityConfig.map is required for Leaflet map')

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MapContainer style={containerStyle} center={center} zoom={zoom} scrollWheelZoom={true}>
        <FitBounds resources={resources} center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {resources.map((r) => {
          const lat = Number(r.lat)
          const lng = Number(r.lng)
          if (Number.isNaN(lat) || Number.isNaN(lng)) return null
          return (
            <CircleMarker
              key={r.id}
              center={[lat, lng]}
              radius={8}
              pathOptions={{ color: r.requiresId ? '#d97706' : '#16a34a', fillOpacity: 0.9 }}
              eventHandlers={{ click: () => onSelectResource(r) }}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <strong style={{ color: '#1a73e8' }}>{r.name}</strong>
                  <p style={{ margin: '0.25rem 0' }}>{r.hours}</p>
                  {!r.requiresId && (
                    <span style={{ background: '#e6f4ea', color: '#1b5e20', padding: '0.2rem 0.5rem', borderRadius: 10 }}>
                      No ID Required
                    </span>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
