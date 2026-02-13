'use client'

// Client wrapper: render the full food page UI using server-provided props
import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Clock, Phone, Info, Navigation, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import styles from './food.module.css'
import type { CityConfig, MapResource, ResourceType } from '../../../../types'
import type FoodMapProps from '../../../../components/FoodMapProps'
import ReportIssueButton from '@/components/ReportIssueButton/ReportIssueButton'

const googleFoodMapComponent = '../../../../components/FoodMap'
const leafletFoodMapComponent = '../../../../components/FoodMapLeaflet'

const GoogleMapComponent = dynamic<FoodMapProps>(
  () => import(googleFoodMapComponent).then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className={styles.mapPlaceholder}>Loading map...</div>,
  }
)

const LeafletMapComponent = dynamic<FoodMapProps>(
  () => import(leafletFoodMapComponent).then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className={styles.mapPlaceholder}>Loading map...</div>,
  }
)

type CityOption = { slug: string; name: string }

type ResourcesByType = Partial<Record<ResourceType, MapResource[]>>

export default function FoodPageClient({
  cityConfig,
  resources,
  slug,
  cities = [],
  resourceType = 'food',
  pageTitle = 'Find Free Food',
  listTitle = 'All Food Resources',
}: {
  cityConfig: CityConfig
  resources: ResourcesByType
  slug: string
  cities?: CityOption[]
  resourceType?: ResourceType
  pageTitle?: string
  listTitle?: string
}) {
  const shouldUseGoogle =
    cityConfig.map?.type !== 'leaflet' &&
    typeof cityConfig.map?.googleApiKey === 'string' &&
    cityConfig.map.googleApiKey.trim().length > 0
  const MapComponent = shouldUseGoogle ? GoogleMapComponent : LeafletMapComponent
  const normalizedType: ResourceType = resourceType || 'food'
  const router = useRouter()
  const { status } = useSession()
  const canSuggestUpdates = status === 'authenticated'

  const [selectedResource, setSelectedResource] = useState<MapResource | null>(null)
  const resourceList: MapResource[] = Array.isArray(resources?.[normalizedType])
    ? resources[normalizedType] ?? []
    : []

  const buildSuggestUrl = (resource?: MapResource) => {
    const params = new URLSearchParams()
    params.set('category', normalizedType)
    if (resource) {
      params.set('resourceId', resource.id)
      if (resource.name) params.set('name', resource.name)
      if (resource.address) params.set('address', resource.address)
      if (resource.lat !== undefined && resource.lat !== null) params.set('lat', String(resource.lat))
      if (resource.lng !== undefined && resource.lng !== null) params.set('lng', String(resource.lng))
      if (resource.hours) params.set('hours', resource.hours)
      if (resource.daysOpen) params.set('daysOpen', resource.daysOpen)
      if (resource.phone) params.set('phone', resource.phone)
      if (resource.website) params.set('website', resource.website)
      if (resource.notes) params.set('notes', resource.notes)
      if (resource.requiresId !== undefined) params.set('requiresId', String(resource.requiresId))
      if (resource.walkIn !== undefined) params.set('walkIn', String(resource.walkIn))
      if (resource.availabilityStatus) params.set('availabilityStatus', resource.availabilityStatus)
    }
    return `/${slug}/food/suggest?${params.toString()}`
  }

  const formatAvailability = (value?: MapResource['availabilityStatus']) => {
    if (!value) return ''
    if (value === 'not_sure') return 'Not sure'
    return value === 'yes' ? 'Yes' : 'No'
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    const timeZone = cityConfig.city?.timeZone
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
        timeZoneName: timeZone ? 'short' : undefined,
      }).format(parsed)
    } catch {
      return parsed.toLocaleString()
    }
  }

  const handleGetDirections = (resource: MapResource) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(resource.address)}`
    window.open(url, '_blank')
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.navLink}>
            Home
          </Link>
          <Link href="/about" className={styles.navLink}>
            About
          </Link>
        </div>

        <h1>{pageTitle}</h1>

        <div className={styles.headerRight}>
          <select
            className={styles.citySelect}
            value={slug}
            aria-label="Select city"
            onChange={(e) => {
              const nextSlug = e.target.value
              router.push(`/${nextSlug}/${normalizedType}`)
            }}
          >
            {(cities || []).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <div className={styles.resourceCount}>{resourceList.length} locations</div>
          {!canSuggestUpdates && (
            <button
              type="button"
              className={styles.signInButton}
              onClick={() => signIn('google')}
            >
              Sign in to contribute
            </button>
          )}
          {canSuggestUpdates && (
            <Link href={buildSuggestUrl()} className={styles.suggestAddButton}>
              Add Location
            </Link>
          )}
        </div>
      </header>

      <div className={styles.mapContainer} style={{ height: 420 }}>
        <MapComponent
          resources={resourceList}
          selectedResource={selectedResource}
          onSelectResource={setSelectedResource}
          cityConfig={cityConfig}
        />

        {selectedResource && (
          <div className={styles.cardOverlay} onClick={() => setSelectedResource(null)}>
            <div className={styles.resourceCard} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeCard} onClick={() => setSelectedResource(null)} aria-label="Close">
                <X size={20} />
              </button>

              <h2>{selectedResource.name}</h2>

              <div className={styles.cardSection}>
                <MapPin size={18} />
                <span>{selectedResource.address}</span>
              </div>

              <div className={styles.cardSection}>
                <Clock size={18} />
                <div>
                  <strong>{selectedResource.hours}</strong>
                  <p className={styles.daysOpen}>{selectedResource.daysOpen}</p>
                </div>
              </div>

              {selectedResource.phone && (
                <div className={styles.cardSection}>
                  <Phone size={18} />
                  <a href={`tel:${selectedResource.phone}`}>{selectedResource.phone}</a>
                </div>
              )}

              <div className={styles.requirements}>
                <div className={`${styles.badge} ${!selectedResource.requiresId ? styles.badgeGreen : styles.badgeYellow}`}>
                  {selectedResource.requiresId ? 'ID Required' : 'No ID Required'}
                </div>
                {selectedResource.walkIn && (
                  <div className={`${styles.badge} ${styles.badgeGreen}`}>Walk-ins Welcome</div>
                )}
              </div>

              {selectedResource.notes && (
                <div className={styles.notes}>
                  <Info size={18} />
                  <span>{selectedResource.notes}</span>
                </div>
              )}

              {(selectedResource.availabilityStatus || selectedResource.lastAvailableAt) && (
                <div className={styles.availabilityPanel}>
                  <div className={styles.availabilityHeader}>
                    <span
                      className={`${styles.availabilityDot} ${
                        selectedResource.availabilityStatus === 'yes'
                          ? styles.availabilityDotYes
                          : selectedResource.availabilityStatus === 'no'
                            ? styles.availabilityDotNo
                            : styles.availabilityDotUnknown
                      }`}
                      aria-hidden="true"
                    />
                    <strong>Availability</strong>
                    {selectedResource.availabilityStatus && (
                      <span className={styles.availabilityStatus}>
                        {formatAvailability(selectedResource.availabilityStatus)}
                      </span>
                    )}
                  </div>
                  {selectedResource.lastAvailableAt && (
                    <div className={styles.availabilityMeta}>
                      Last reported available: {formatDateTime(selectedResource.lastAvailableAt)}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.buttonRow}>
                <button 
                  className={styles.directionsButton}
                  onClick={() => handleGetDirections(selectedResource)}
                >
                  <Navigation size={18} />
                  Get Directions
                </button>
                {canSuggestUpdates && (
                  <Link href={buildSuggestUrl(selectedResource)} className={styles.suggestButton}>
                    Suggest Update
                  </Link>
                )}
                <ReportIssueButton resource={selectedResource} compact={true} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.resourceList}>
        <h3>{listTitle}</h3>
        {resourceList.map((resource) => (
          <div
            key={resource.id}
            className={`${styles.listItem} ${selectedResource?.id === resource.id ? styles.listItemSelected : ''}`}
            onClick={() => setSelectedResource(resource)}
          >
            <div className={styles.listItemHeader}>
              <MapPin size={16} />
              <strong>{resource.name}</strong>
            </div>
            <div className={styles.listItemHours}>{resource.hours || ''}</div>
            {resource.lastAvailableAt && (
              <div className={styles.listItemMeta}>Last reported available: {formatDateTime(resource.lastAvailableAt)}</div>
            )}
            {resource.availabilityStatus && (
              <div className={styles.listItemMeta}>Availability: {formatAvailability(resource.availabilityStatus)}</div>
            )}
            {!resource.requiresId && resource.requiresId !== undefined && (
              <div className={`${styles.badgeSmall} ${styles.badgeGreen}`}>No ID Required</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}