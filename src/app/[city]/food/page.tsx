import path from 'path'
import fs from 'fs'
import { redirect } from 'next/navigation'
import FoodPageClient from './FoodPageClient'

export default async function Page({ params }: { params: any }) {
  const { city } = await params
  if (!city) return redirect('/des-moines/food')

  const base = process.cwd()
  const cfgPath = path.join(base, 'config', 'cities', `${city}.json`)
  const resPath = path.join(base, 'data', city, 'resources.json')

  if (!fs.existsSync(cfgPath)) throw new Error(`City config not found: ${city}`)
  if (!fs.existsSync(resPath)) throw new Error(`Resources not found for city: ${city}`)

  const cityConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
  const resources = JSON.parse(fs.readFileSync(resPath, 'utf8'))

  // Prefer supplying the Google Maps API key via environment variables
  // Avoid committing API keys in `config/cities/*.json`. Use NEXT_PUBLIC_* if the key
  // must be available on the client. This keeps configs safe while allowing overrides.
  const envKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY
  if (envKey) {
    cityConfig.map = { ...(cityConfig.map || {}), googleApiKey: envKey }
  }

  return <FoodPageClient cityConfig={cityConfig} resources={resources} slug={city} />
}