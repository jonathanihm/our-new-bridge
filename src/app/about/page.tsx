import { getCities } from '@/lib/db-utils'
import AboutPageClient from './AboutPageClient'

type CityOption = { slug: string; name: string }

export default async function AboutPage() {
  const cities = await getCities()
  const cityOptions: CityOption[] = (cities || [])
    .map((c) => ({
      slug: String(c.slug),
      name: String(c.name ?? c.slug),
    }))
    .filter((c) => Boolean(c.slug))

  return <AboutPageClient cities={cityOptions} />
}
