'use client'

import type { MapResource } from '../types'
import { useEffect, useState, useCallback, useRef } from 'react'
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api'
import FoodMapProps from './FoodMapProps'

const containerStyle = { width: '100%', height: '100%' }

export default function FoodMap({ resources, selectedResource, onSelectResource, cityConfig }: FoodMapProps) {
  const apiKey = cityConfig.map.googleApiKey
  if (!apiKey) throw new Error('Google Maps API key is not defined in the configuration.')

  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey })

  const [activeResource, setActiveResource] = useState<MapResource | null>(selectedResource)
  useEffect(() => setActiveResource(selectedResource), [selectedResource])

  const mapRef = useRef<any>(null)
  const mapInitializedRef = useRef(false)
  const onMapLoad = useCallback((map: any) => {
    mapRef.current = map
    // only initialize bounds/center once on first load to avoid recentering on InfoWindow close or small state changes
    if (mapInitializedRef.current) return
    mapInitializedRef.current = true
    if (resources && resources.length > 0) {
      const g = (window as any).google
      const bounds = new g.maps.LatLngBounds()
      resources.forEach(r => {
        const lat = Number(r.lat)
        const lng = Number(r.lng)
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) bounds.extend(new g.maps.LatLng(lat, lng))
      })
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds)
        return
      }
    }
    // fallback center/zoom
    map.setCenter({ lat: cityConfig.map.centerLat, lng: cityConfig.map.centerLng })
    map.setZoom(cityConfig.map.defaultZoom)
  }, [resources, cityConfig])

  const handleMarkerClick = useCallback((resource: MapResource) => {
    setActiveResource(resource)
    onSelectResource(resource)
  }, [onSelectResource])

  if (loadError) return <div style={{ height: '100%' }}>Map failed to load</div>
  if (!isLoaded) return <div style={{ height: '100%' }}>Loading map...</div>

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      onLoad={onMapLoad}
      // do NOT pass `center` or `zoom` as props (uncontrolled) — prevents re-centering on subsequent renders
    >
      {resources.map((r) => (
        <Marker
          key={r.id}
          position={{ lat: Number(r.lat), lng: Number(r.lng) }}
          onClick={() => handleMarkerClick(r)}
        />
      ))}

      {activeResource && (
        <InfoWindow
          position={{ lat: Number(activeResource.lat), lng: Number(activeResource.lng) }}
          onCloseClick={() => {
            setActiveResource(null)
            // do NOT call onSelectResource(null) — leave parent/map state alone
          }}
        >
          <div style={{ minWidth: 200 }}>
            <strong style={{ color: '#1a73e8' }}>{activeResource.name}</strong>
            <p style={{ margin: '0.25rem 0' }}>{activeResource.hours}</p>
            {!activeResource.requiresId && (
              <span style={{ background: '#e6f4ea', color: '#1b5e20', padding: '0.2rem 0.5rem', borderRadius: 10 }}>
                No ID Required
              </span>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )
}