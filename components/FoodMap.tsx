'use client'

import type { MapResource } from '../types'
import { useCallback, useRef } from 'react'
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api'
import FoodMapProps from './FoodMapProps'

const containerStyle = { width: '100%', height: '100%' }

const mapOptions: google.maps.MapOptions = {
  gestureHandling: 'greedy', // Better mobile touch support - allows one-finger pan/zoom
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
}

export default function FoodMap({ resources, selectedResource, onSelectResource, cityConfig }: FoodMapProps) {
  const apiKey = cityConfig.map.googleApiKey
  if (!apiKey) throw new Error('Google Maps API key is not defined in the configuration.')

  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey })

  const activeResource = selectedResource

  const mapRef = useRef<google.maps.Map | null>(null)
  const mapInitializedRef = useRef(false)
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    // only initialize bounds/center once on first load to avoid recentering on InfoWindow close or small state changes
    if (mapInitializedRef.current) return
    mapInitializedRef.current = true
    if (resources && resources.length > 0) {
      const g = window.google as typeof google
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
    onSelectResource(resource)
  }, [onSelectResource])

  if (loadError) return <div className="h-full flex items-center justify-center text-[var(--primary)]">Map failed to load</div>
  if (!isLoaded) return <div className="h-full flex items-center justify-center text-[var(--primary)]">Loading map...</div>

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      onLoad={onMapLoad}
      options={mapOptions}
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
          onCloseClick={() => onSelectResource(null)}
        >
          <div className="min-w-[200px]">
            <strong className="text-[#1a73e8]">{activeResource.name}</strong>
            <p className="my-1">{activeResource.hours}</p>
            {!activeResource.requiresId && (
              <span className="bg-[#e6f4ea] text-[#1b5e20] px-2 py-1 rounded-xl text-xs inline-block">
                No ID Required
              </span>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )
}