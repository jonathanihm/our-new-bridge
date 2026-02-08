'use client'

// Client wrapper: render the full food page UI using server-provided props
import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Clock, Phone, Info, Navigation, X, ArrowLeft } from 'lucide-react'
import dynamic from 'next/dynamic'
import styles from './food.module.css'
import type { MapResource, ResourceType } from '../../../../types'
import ReportIssueButton from '@/components/ReportIssueButton/ReportIssueButton'

const googleFoodMapComponent = '../../../../components/FoodMap';
const leafletFoodMapComponent = '../../../../components/FoodMapLeaflet';

// Change line below to use either google maps or leaflet map component
const MapComponent = dynamic<any>(
  () => import(googleFoodMapComponent).then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className={styles.mapPlaceholder}>Loading map...</div>,
  }
)

export default function FoodPageClient({ cityConfig, resources, slug, resourceType = 'food', pageTitle = 'Find Free Food', listTitle = 'All Food Resources' }: any) {
  const normalizedType: ResourceType = (resourceType as ResourceType) || 'food'

  const [selectedResource, setSelectedResource] = useState<MapResource | null>(null)
  const typedResources = resources as Record<string, any>
  const resourceList: MapResource[] = Array.isArray(typedResources?.[normalizedType])
    ? typedResources[normalizedType]
    : []

  const handleGetDirections = (resource: MapResource) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(resource.address)}`
    window.open(url, '_blank')
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href={`/${slug}`} className={styles.backButton}>
          <ArrowLeft size={20} /> Back
        </Link>
        <h1>{pageTitle}</h1>
        <div className={styles.resourceCount}>{resourceList.length} locations</div>
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

              <div className={styles.buttonRow}>
                <button 
                  className={styles.directionsButton}
                  onClick={() => handleGetDirections(selectedResource)}
                >
                  <Navigation size={18} />
                  Get Directions
                </button>
                
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
            {!resource.requiresId && resource.requiresId !== undefined && (
              <div className={`${styles.badgeSmall} ${styles.badgeGreen}`}>No ID Required</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}