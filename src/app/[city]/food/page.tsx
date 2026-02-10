import { getCityBySlug, getCities } from '@/lib/db-utils'
import { redirect } from 'next/navigation'
import type { CityConfig, MapResource, ResourceType } from '@/types'
import FoodPageClient from './FoodPageClient'

type CityParams = { city?: string }
type CityOption = { slug: string; name: string }
type ResourceLike = {
  id?: string
  externalId?: string
  name?: string
  address?: string
  lat?: number | null
  lng?: number | null
  hours?: string | null
  daysOpen?: string | null
  phone?: string | null
  website?: string | null
  notes?: string | null
  requiresId?: boolean | null
  walkIn?: boolean | null
  availabilityStatus?: 'yes' | 'no' | 'not_sure' | null
  lastAvailableAt?: Date | string | null
}

export default async function Page({ params }: { params: Promise<CityParams> }) {
  const { city } = await params
  if (!city) return redirect('/des-moines/food')

  const cityData = await getCityBySlug(city)

  if (!cityData) {
    throw new Error(`City not found: ${city}`)
  }

  const cities = await getCities()

  // Transform to match the existing page props
  const cityConfig: CityConfig = {
    slug: cityData.slug,
    city: {
      name: cityData.name,
      state: cityData.state || '',
    },
    map: {
      centerLat: cityData.centerLat,
      centerLng: cityData.centerLng,
      defaultZoom: cityData.defaultZoom || 14,
      type: cityData.mapType || 'google',
      googleApiKey:
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY,
    },
  }

  const resources: Partial<Record<ResourceType, MapResource[]>> = {
    food: Array.isArray(cityData.resources)
      ? (cityData.resources as ResourceLike[]).map((r) => ({
          id: r.externalId || r.id || '',
          name: r.name || '',
          address: r.address || '',
          lat: r.lat,
          lng: r.lng,
          hours: r.hours || '',
          daysOpen: r.daysOpen || '',
          phone: r.phone || '',
          website: r.website || '',
          notes: r.notes || '',
          requiresId: r.requiresId || false,
          walkIn: r.walkIn || false,
          availabilityStatus: r.availabilityStatus || null,
          lastAvailableAt: r.lastAvailableAt
            ? new Date(r.lastAvailableAt).toISOString()
            : null,
        }))
      : [],
  }

  return (
    <FoodPageClient
      cityConfig={cityConfig}
      resources={resources}
      slug={city}
      cities={(cities as CityOption[] | undefined || []).map((c) => ({ slug: c.slug, name: c.name }))}
      resourceType="food"
      pageTitle="Find Free Food"
      listTitle="All Food Resources"
    />
  )
}