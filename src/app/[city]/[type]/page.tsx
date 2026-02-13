import { getCityBySlug, getCities, getResourcesByCityAndType, type ResourceType } from '@/lib/db-utils'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { redirect } from 'next/navigation'
import FoodPageClient from '../food/FoodPageClient'
import type { CityConfig, MapResource } from '@/types'

const CONFIG_DIR = join(process.cwd(), 'config', 'cities')

const RESOURCE_TYPES: ResourceType[] = ['food', 'shelter', 'housing', 'legal']
const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/

function isValidSlug(value: string) {
  return SLUG_PATTERN.test(value)
}

function isResourceType(value: string): value is ResourceType {
  return (RESOURCE_TYPES as string[]).includes(value)
}

function defaultTitles(type: ResourceType) {
  switch (type) {
    case 'food':
      return { pageTitle: 'Find Free Food', listTitle: 'All Food Resources' }
    case 'shelter':
      return { pageTitle: 'Find Shelter', listTitle: 'All Shelter Resources' }
    case 'housing':
      return { pageTitle: 'Housing Help', listTitle: 'All Housing Resources' }
    case 'legal':
      return { pageTitle: 'Legal Help', listTitle: 'All Legal Resources' }
  }
}

type CityParams = { city?: string; type?: string }
type CityOption = { slug: string; name: string }
type CityConfigFile = Partial<CityConfig> & {
  slug?: string
  city?: {
    name?: string
    state?: string
    fullName?: string
    tagline?: string
    description?: string
  }
  map?: CityConfig['map'] & { zoom?: number }
}
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

async function getCityConfigFromDisk(slug: string): Promise<CityConfigFile | null> {
  if (!isValidSlug(slug)) return null
  try {
    const raw = await readFile(join(CONFIG_DIR, `${slug}.json`), 'utf-8')
    return JSON.parse(raw) as CityConfigFile
  } catch {
    return null
  }
}

export default async function Page({ params }: { params: Promise<CityParams> }) {
  const { city, type } = await params
  if (!city) return redirect('/des-moines/food')
  if (!isValidSlug(String(city))) return redirect('/des-moines/food')

  const requestedType = String(type || '')
  if (!isResourceType(requestedType)) {
    return redirect(`/${city}/food`)
  }

  const config = await getCityConfigFromDisk(city)
  const feature = config?.features?.[requestedType]

  // If a city explicitly disables a feature, route back to food.
  if (feature && feature.enabled === false) {
    return redirect(`/${city}/food`)
  }

  const cityData = await getCityBySlug(city)
  if (!cityData) {
    throw new Error(`City not found: ${city}`)
  }

  const cities = await getCities()

  const titles = {
    ...defaultTitles(requestedType),
    pageTitle: feature?.title || defaultTitles(requestedType).pageTitle,
  }

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

  const rawResources = await getResourcesByCityAndType(city, requestedType)

  const resources: Partial<Record<ResourceType, MapResource[]>> = {
    [requestedType]: Array.isArray(rawResources)
      ? (rawResources as ResourceLike[]).map((r) => ({
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
      resourceType={requestedType}
      pageTitle={titles.pageTitle}
      listTitle={titles.listTitle}
    />
  )
}
