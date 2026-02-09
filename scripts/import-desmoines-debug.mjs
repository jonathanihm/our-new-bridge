import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { readFile } from 'fs/promises'
import { join } from 'path'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  const configPath = join(process.cwd(), 'config', 'cities', 'des-moines.json')
  const config = JSON.parse(await readFile(configPath, 'utf-8'))
  console.log('Importing city', config.city.name, 'slug', config.slug)

  const city = await prisma.city.upsert({
    where: { slug: config.slug },
    update: { name: config.city.name, centerLat: config.map.centerLat, centerLng: config.map.centerLng },
    create: { slug: config.slug, name: config.city.name, centerLat: config.map.centerLat, centerLng: config.map.centerLng },
  })
  console.log('City upserted id=', city.id)

  const resourcePath = join(process.cwd(), 'data', config.slug, 'resources.json')
  try {
    const resources = JSON.parse(await readFile(resourcePath, 'utf-8'))
    console.log('Found resources.food length=', resources.food?.length)

    for (const r of resources.food || []) {
      try {
        const res = await prisma.resource.upsert({
          where: { cityId_externalId: { cityId: city.id, externalId: String(r.id) } },
          update: { name: r.name, address: r.address, lat: r.lat || null, lng: r.lng || null },
          create: { externalId: String(r.id), cityId: city.id, name: r.name, address: r.address, lat: r.lat || null, lng: r.lng || null },
        })
        console.log('  upserted resource externalId=', res.externalId)
      } catch (error) {
        console.error('  resource upsert failed for id=', r.id, error)
      }
    }
  } catch (error) {
    console.error('Failed reading resources file', error)
  }

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
