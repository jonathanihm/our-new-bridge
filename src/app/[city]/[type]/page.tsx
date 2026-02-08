import { getCityBySlug, getResourcesByCityAndType, type ResourceType } from '@/lib/db-utils'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { redirect } from 'next/navigation'
import FoodPageClient from '../food/FoodPageClient'

const CONFIG_DIR = join(process.cwd(), 'config', 'cities')

const RESOURCE_TYPES: ResourceType[] = ['food', 'shelter', 'housing', 'legal']

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

async function getCityConfigFromDisk(slug: string): Promise<any | null> {
  try {
    const raw = await readFile(join(CONFIG_DIR, `${slug}.json`), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default async function Page({ params }: { params: any }) {
  const { city, type } = await params
  if (!city) return redirect('/des-moines/food')

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

  const titles = {
    ...defaultTitles(requestedType),
    pageTitle: feature?.title || defaultTitles(requestedType).pageTitle,
  }

  const cityConfig = {
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

  const resources = {
    [requestedType]: Array.isArray(rawResources)
      ? rawResources.map((r: any) => ({
          id: r.id || r.externalId,
          name: r.name,
          address: r.address,
          lat: r.lat,
          lng: r.lng,
          hours: r.hours || '',
          daysOpen: r.daysOpen || '',
          phone: r.phone || '',
          website: r.website || '',
          notes: r.notes || '',
          requiresId: r.requiresId || false,
          walkIn: r.walkIn || false,
        }))
      : [],
  }

  return (
    <FoodPageClient
      cityConfig={cityConfig}
      resources={resources}
      slug={city}
      resourceType={requestedType}
      pageTitle={titles.pageTitle}
      listTitle={titles.listTitle}
    />
  )
}
