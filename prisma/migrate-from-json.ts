/**
 * Migration script: Import JSON data to Supabase
 * Run with: npx ts-node prisma/migrate-from-json.ts
 */

import { PrismaClient } from '@prisma/client'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

const prisma = new PrismaClient()
const CONFIG_DIR = join(process.cwd(), 'config', 'cities')
const DATA_DIR = join(process.cwd(), 'data')

async function main() {
  console.log('📦 Starting migration from JSON to Supabase...\n')

  try {
    const files = await readdir(CONFIG_DIR)
    let citiesImported = 0
    let resourcesImported = 0

    for (const file of files) {
      if (!file.endsWith('.json')) continue

      const configPath = join(CONFIG_DIR, file)
      const config = JSON.parse(await readFile(configPath, 'utf-8'))

      console.log(`📍 Importing city: ${config.city.name}...`)

      // Create city
      const city = await prisma.city.upsert({
        where: { slug: config.slug },
        update: {
          name: config.city.name,
          state: config.city.state || null,
          fullName: config.city.fullName || config.city.name,
          tagline: config.city.tagline || 'Find help. Fast.',
          description: config.city.description || 'A simple, humane platform for finding essential resources',
          centerLat: config.map.centerLat,
          centerLng: config.map.centerLng,
          defaultZoom: config.map.defaultZoom || 12,
        },
        create: {
          slug: config.slug,
          name: config.city.name,
          state: config.city.state || null,
          fullName: config.city.fullName || config.city.name,
          tagline: config.city.tagline || 'Find help. Fast.',
          description: config.city.description || 'A simple, humane platform for finding essential resources',
          centerLat: config.map.centerLat,
          centerLng: config.map.centerLng,
          defaultZoom: config.map.defaultZoom || 12,
        },
      })

      citiesImported++

      // Import resources
      const resourcePath = join(DATA_DIR, config.slug, 'resources.json')
      try {
        const resources = JSON.parse(await readFile(resourcePath, 'utf-8'))

        const categories = ['food', 'shelter', 'housing', 'legal'] as const
        let cityResourceCount = 0

        for (const category of categories) {
          const list = Array.isArray(resources?.[category]) ? resources[category] : []
          for (const resource of list) {
            // Skip resources missing an id
            if (resource?.id == null) {
              console.log(`  ⚠️  Skipping ${category} resource with missing id`)
              continue
            }

            // Normalize types: externalId as string, lat/lng as number (float)
            const externalId = String(resource.id)
            const lat = resource.lat != null ? parseFloat(String(resource.lat)) : null
            const lng = resource.lng != null ? parseFloat(String(resource.lng)) : null

            await prisma.resource.upsert({
              where: {
                cityId_category_externalId: {
                  cityId: city.id,
                  category,
                  externalId,
                },
              },
              update: {
                category,
                name: resource.name,
                address: resource.address,
                lat,
                lng,
                hours: resource.hours || null,
                daysOpen: resource.daysOpen || null,
                phone: resource.phone || null,
                website: resource.website || null,
                requiresId: resource.requiresId || false,
                walkIn: resource.walkIn || false,
                notes: resource.notes || null,
              },
              create: {
                externalId,
                cityId: city.id,
                category,
                name: resource.name,
                address: resource.address,
                lat,
                lng,
                hours: resource.hours || null,
                daysOpen: resource.daysOpen || null,
                phone: resource.phone || null,
                website: resource.website || null,
                requiresId: resource.requiresId || false,
                walkIn: resource.walkIn || false,
                notes: resource.notes || null,
              },
            })

            resourcesImported++
            cityResourceCount++
          }
        }

        console.log(`  ✓ ${cityResourceCount} resources imported\n`)
      } catch (err) {
        console.log(`  ⚠️  Error importing resources:`, err instanceof Error ? err.message : String(err))
        console.log(`  (Resource path: ${resourcePath})\n`)
      }
    }

    console.log('✅ Migration complete!')
    console.log(`  Cities: ${citiesImported}`)
    console.log(`  Resources: ${resourcesImported}\n`)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
