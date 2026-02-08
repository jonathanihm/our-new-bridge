import { getCityBySlug } from '@/lib/db-utils'
import { redirect } from 'next/navigation'
import FoodPageClient from './FoodPageClient'

export default async function Page({ params }: { params: any }) {
  const { city } = await params
  if (!city) return redirect('/des-moines/food')

  const cityData = await getCityBySlug(city)

  if (!cityData) {
    throw new Error(`City not found: ${city}`)
  }

  // Transform to match the existing page props
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

  const resources = {
    food: Array.isArray(cityData.resources)
      ? cityData.resources.map((r: any) => ({
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
      resourceType="food"
      pageTitle="Find Free Food"
      listTitle="All Food Resources"
    />
  )
}