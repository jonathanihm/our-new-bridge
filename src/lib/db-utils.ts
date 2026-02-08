import { PrismaClient } from '@prisma/client'
import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const CONFIG_DIR = join(process.cwd(), 'config', 'cities')
const DATA_DIR = join(process.cwd(), 'data')

export type ResourceType = 'food' | 'shelter' | 'housing' | 'legal'

const RESOURCE_TYPES: ResourceType[] = ['food', 'shelter', 'housing', 'legal']

// Check if we have a valid DATABASE_URL (must start with postgresql:// or postgres://)
const isValidDatabaseUrl = () => {
  const url = process.env.DATABASE_URL
  return url && (url.startsWith('postgresql://') || url.startsWith('postgres://'))
}

export const USE_DATABASE = isValidDatabaseUrl()

let prisma: PrismaClient | null = null

export function getPrismaClient() {
  if (!prisma && USE_DATABASE) {
    prisma = new PrismaClient()
  }
  return prisma
}

// City operations
export async function getCities() {
  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    return await prismaClient.city.findMany({
      include: { resources: true },
      orderBy: { name: 'asc' },
    })
  } else {
    // JSON-based
    const files = await readdir(CONFIG_DIR)
    const cities = []
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const slug = file.replace('.json', '')
      const config = JSON.parse(await readFile(join(CONFIG_DIR, file), 'utf-8'))
      
      // Read resources count
      let resourceCount = 0
      try {
        const resources = JSON.parse(
          await readFile(join(DATA_DIR, slug, 'resources.json'), 'utf-8')
        )
        resourceCount = resources.food?.length || 0
      } catch {}
      
      cities.push({
        slug: config.slug || slug,
        name: config.city?.name || slug,
        state: config.city?.state || '',
        centerLat: config.map?.centerLat || 0,
        centerLng: config.map?.centerLng || 0,
        _count: { resources: resourceCount },
      })
    }
    return cities
  }
}

export async function getCityBySlug(slug: string) {
  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    const city = await prismaClient.city.findUnique({
      where: { slug },
      include: { resources: true },
    })

    if (!city) return null

    // Prisma City model doesn't currently store map type; normalize return shape
    // so callers can rely on `mapType` existing in both DB and JSON modes.
    const mapType = (city as any).mapType ?? 'google'
    return { ...city, mapType }
  } else {
    // JSON-based
    try {
      const config = JSON.parse(
        await readFile(join(CONFIG_DIR, `${slug}.json`), 'utf-8')
      )
      const resources = JSON.parse(
        await readFile(join(DATA_DIR, slug, 'resources.json'), 'utf-8')
      )
      
      return {
        slug: config.slug || slug,
        name: config.city?.name || slug,
        state: config.city?.state || '',
        fullName: config.city?.fullName || '',
        tagline: config.city?.tagline || 'Find help. Fast.',
        description:
          config.city?.description || 'A simple, humane platform for finding essential resources',
        centerLat: config.map?.centerLat || 0,
        centerLng: config.map?.centerLng || 0,
        defaultZoom: config.map?.defaultZoom ?? config.map?.zoom ?? 14,
        mapType: config.map?.type || 'google',
        resources: resources.food?.map((r: any) => ({
          id: r.id,
          externalId: r.id,
          name: r.name,
          address: r.address,
          lat: r.lat,
          lng: r.lng,
          hours: r.hours || '',
          phone: r.phone || '',
          website: r.website || '',
          notes: r.notes || '',
        })) || [],
      }
    } catch {
      return null
    }
  }
}

export async function createCity(data: {
  slug: string
  name: string
  state: string
  centerLat: number
  centerLng: number
}) {
  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    return await prismaClient.city.create({ data })
  } else {
    // JSON-based
    const config = {
      slug: data.slug,
      city: {
        name: data.name,
        state: data.state,
        fullName: '',
        tagline: 'Find help. Fast.',
        description: 'A simple, humane platform for finding essential resources',
      },
      map: { centerLat: data.centerLat, centerLng: data.centerLng, defaultZoom: 12 },
    }
    await writeFile(join(CONFIG_DIR, `${data.slug}.json`), JSON.stringify(config, null, 2))
    return data
  }
}

export async function validateConfig() {
  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    const cities = await prismaClient.city.findMany({
      include: { resources: true },
      orderBy: { name: 'asc' },
    })
    
    const results: any[] = []
    for (const city of cities) {
      const issues: string[] = []
      const resourceIssues: string[] = []

      if (!city.slug) issues.push('Missing slug')
      if (!city.name) issues.push('Missing name')
      if (!city.centerLat) issues.push('Missing centerLat')
      if (!city.centerLng) issues.push('Missing centerLng')

      city.resources.forEach(
        (
          r: {
            externalId?: string
            name?: string
            address?: string
            lat?: number | null
            lng?: number | null
          },
          idx: number
        ) => {
        if (!r.externalId) resourceIssues.push(`Resource ${idx}: missing id`)
        if (!r.name) resourceIssues.push(`Resource ${idx}: missing name`)
        if (!r.address) resourceIssues.push(`Resource ${idx}: missing address`)
        if (!r.lat || !r.lng) resourceIssues.push(`Resource ${idx}: missing coordinates`)
        }
      )

      results.push({
        city: city.name,
        slug: city.slug,
        status: issues.length === 0 && resourceIssues.length === 0 ? 'healthy' : 'warning',
        resourceCount: city.resources.length,
        configIssues: issues,
        resourceIssues,
      })
    }
    return { results, errors: [] }
  } else {
    // JSON-based validation
    const results: any[] = []
    const errors: string[] = []
    const files = await readdir(CONFIG_DIR)

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const cityName = file.replace('.json', '')

      try {
        const config = JSON.parse(await readFile(join(CONFIG_DIR, file), 'utf-8'))
        const issues: string[] = []

        if (!config.slug) issues.push('Missing slug')
        if (!config.city?.name) issues.push('Missing city.name')
        if (!config.map?.centerLat) issues.push('Missing map.centerLat')
        if (!config.map?.centerLng) issues.push('Missing map.centerLng')

        let resourceIssues: string[] = []
        let resourceCount = 0
        try {
          const resources = JSON.parse(
            await readFile(join(DATA_DIR, config.slug || cityName, 'resources.json'), 'utf-8')
          )
          resourceCount = resources.food?.length || 0
          resources.food?.forEach((r: any, idx: number) => {
            if (!r.id) resourceIssues.push(`Resource ${idx}: missing id`)
            if (!r.name) resourceIssues.push(`Resource ${idx}: missing name`)
            if (!r.address) resourceIssues.push(`Resource ${idx}: missing address`)
            if (!r.lat || !r.lng) resourceIssues.push(`Resource ${idx}: missing coordinates`)
          })
        } catch {
          resourceIssues.push('resources.json file not found or invalid')
        }

        results.push({
          city: cityName,
          slug: config.slug || cityName,
          status: issues.length === 0 && resourceIssues.length === 0 ? 'healthy' : 'warning',
          resourceCount,
          configIssues: issues,
          resourceIssues,
        })
      } catch (error) {
        errors.push(`${file}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    return { results, errors }
  }
}

export async function getResourcesByCity(slug: string) {
  // Back-compat: existing admin routes treat this as "food" resources.
  return await getResourcesByCityAndType(slug, 'food')
}

export async function getResourcesByCityAndType(slug: string, type: ResourceType) {
  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    return await prismaClient.resource.findMany({
      where: { city: { slug }, category: type as any },
      orderBy: { createdAt: 'desc' },
    })
  } else {
    // JSON-based
    try {
      const parsed = JSON.parse(await readFile(join(DATA_DIR, slug, 'resources.json'), 'utf-8'))
      const list = parsed?.[type]
      return Array.isArray(list) ? list : []
    } catch {
      return []
    }
  }
}

export async function upsertResource(
  slug: string,
  data: {
    id: string
    category?: ResourceType
    name: string
    address: string
    lat?: number | null
    lng?: number | null
    hours?: string | null
    daysOpen?: string | null
    phone?: string | null
    website?: string | null
    requiresId?: boolean
    walkIn?: boolean
    notes?: string | null
  }
) {
  const category: ResourceType = data.category ?? 'food'

  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    const city = await prismaClient.city.findUnique({
      where: { slug },
    })

    if (!city) {
      throw new Error('City not found')
    }

    return await prismaClient.resource.upsert({
      where: {
        cityId_category_externalId: {
          cityId: city.id,
          category: category as any,
          externalId: data.id,
        },
      },
      update: {
        category: category as any,
        name: data.name,
        address: data.address,
        lat: data.lat || null,
        lng: data.lng || null,
        hours: data.hours || null,
        daysOpen: data.daysOpen || null,
        phone: data.phone || null,
        website: data.website || null,
        requiresId: data.requiresId || false,
        walkIn: data.walkIn || false,
        notes: data.notes || null,
      },
      create: {
        externalId: data.id,
        cityId: city.id,
        category: category as any,
        name: data.name,
        address: data.address,
        lat: data.lat || null,
        lng: data.lng || null,
        hours: data.hours || null,
        daysOpen: data.daysOpen || null,
        phone: data.phone || null,
        website: data.website || null,
        requiresId: data.requiresId || false,
        walkIn: data.walkIn || false,
        notes: data.notes || null,
      },
    })
  } else {
    // JSON-based
    const resourcePath = join(DATA_DIR, slug, 'resources.json')
    let resources: Record<string, any[]> = { food: [], shelter: [], housing: [], legal: [] }

    try {
      const parsed = JSON.parse(await readFile(resourcePath, 'utf-8'))
      if (parsed && typeof parsed === 'object') {
        for (const t of RESOURCE_TYPES) {
          if (Array.isArray(parsed[t])) resources[t] = parsed[t]
        }
      }
    } catch {}

    if (!Array.isArray(resources[category])) resources[category] = []

    // Find and update or add
    // Ensure ID comparison is done on string values, trimmed of whitespace
    const normalizedId = String(data.id).trim()
    const idx = resources[category].findIndex((r: any) => String(r.id).trim() === normalizedId)
    
    if (idx >= 0) {
      // Update existing resource - preserve all original fields and merge with new data
      resources[category][idx] = { 
        ...resources[category][idx], 
        ...data,
        // Explicitly set these to ensure they match the expected types
        id: data.id,
        name: data.name,
        address: data.address,
        lat:
          data.lat !== null && data.lat !== undefined ? data.lat : resources[category][idx].lat,
        lng:
          data.lng !== null && data.lng !== undefined ? data.lng : resources[category][idx].lng,
      }
    } else {
      // Create new resource
      resources[category].push({ ...data, category: undefined })
    }

    await writeFile(resourcePath, JSON.stringify(resources, null, 2))
    return data
  }
}

export async function exportData() {
  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    const cities = await prismaClient.city.findMany({
      include: { resources: true },
      orderBy: { name: 'asc' },
    })

    const backupData: any = {
      exportedAt: new Date().toISOString(),
      cities: {},
    }

    for (const city of cities) {
      // Export schema should match:
      // - config/cities/<slug>.json
      // - data/<slug>/resources.json

      // Use on-disk files as a base if they exist, so we preserve fields
      // not currently stored in the database (features, contact, branding, etc.).
      let configFromDisk: any | null = null
      try {
        configFromDisk = JSON.parse(
          await readFile(join(CONFIG_DIR, `${city.slug}.json`), 'utf-8')
        )
      } catch {}

      let resourcesFromDisk: any | null = null
      try {
        resourcesFromDisk = JSON.parse(
          await readFile(join(DATA_DIR, city.slug, 'resources.json'), 'utf-8')
        )
      } catch {}

      const config = configFromDisk
        ? {
            ...configFromDisk,
            slug: city.slug,
            city: {
              ...(configFromDisk.city || {}),
              name: city.name,
              state: city.state || '',
              fullName: city.fullName || configFromDisk.city?.fullName || '',
              tagline: city.tagline || configFromDisk.city?.tagline || 'Find help. Fast.',
              description:
                city.description ||
                configFromDisk.city?.description ||
                'A simple, humane platform for finding essential resources',
            },
            map: {
              ...(configFromDisk.map || {}),
              centerLat: city.centerLat,
              centerLng: city.centerLng,
              defaultZoom: city.defaultZoom ?? configFromDisk.map?.defaultZoom ?? 12,
            },
          }
        : {
            slug: city.slug,
            city: {
              name: city.name,
              state: city.state || '',
              fullName: city.fullName || '',
              tagline: city.tagline || 'Find help. Fast.',
              description:
                city.description || 'A simple, humane platform for finding essential resources',
            },
            map: {
              centerLat: city.centerLat,
              centerLng: city.centerLng,
              defaultZoom: city.defaultZoom ?? 12,
            },
            features: {
              food: { enabled: true, title: 'Find Free Food', icon: '🍽️' },
              shelter: { enabled: false, title: 'Find Shelter', icon: '🏠' },
              housing: { enabled: false, title: 'Housing Help', icon: '🏘️' },
              legal: { enabled: false, title: 'Legal Help', icon: '⚖️' },
            },
            contact: { email: 'hello@ournewbridge.org', volunteer: true },
            branding: {
              primaryColor: '#3a5a40',
              secondaryColor: '#588157',
              accentColor: '#a3b18a',
              backgroundColor: '#fdfbf7',
            },
          }

      const resources: any = {
        food: Array.isArray(resourcesFromDisk?.food) ? resourcesFromDisk.food : [],
        shelter: Array.isArray(resourcesFromDisk?.shelter) ? resourcesFromDisk.shelter : [],
        housing: Array.isArray(resourcesFromDisk?.housing) ? resourcesFromDisk.housing : [],
        legal: Array.isArray(resourcesFromDisk?.legal) ? resourcesFromDisk.legal : [],
      }

      // Merge DB resources into each category array, preserving any extra JSON fields.
      for (const type of RESOURCE_TYPES) {
        const dbById = new Map<string, any>()
        for (const r of city.resources) {
          const cat = String((r as any).category ?? 'food') as ResourceType
          if (cat !== type) continue
          dbById.set(String(r.externalId), r)
        }

        const merged: any[] = []
        const usedDbIds = new Set<string>()

        const existingList = Array.isArray(resources[type]) ? resources[type] : []
        for (const existing of existingList) {
          const existingId = String(existing?.id ?? '')
          const dbResource = existingId ? dbById.get(existingId) : undefined
          if (!dbResource) {
            merged.push(existing)
            continue
          }

          usedDbIds.add(existingId)
          merged.push({
            ...existing,
            id: String(dbResource.externalId),
            name: dbResource.name,
            address: dbResource.address,
            lat: dbResource.lat,
            lng: dbResource.lng,
            hours: dbResource.hours ?? existing.hours ?? '',
            daysOpen: dbResource.daysOpen ?? existing.daysOpen ?? '',
            phone: dbResource.phone ?? existing.phone ?? '',
            website: dbResource.website ?? existing.website ?? '',
            requiresId: dbResource.requiresId ?? existing.requiresId ?? false,
            walkIn: dbResource.walkIn ?? existing.walkIn ?? false,
            notes: dbResource.notes ?? existing.notes ?? '',
          })
        }

        for (const r of city.resources) {
          const cat = String((r as any).category ?? 'food') as ResourceType
          if (cat !== type) continue
          const id = String(r.externalId)
          if (usedDbIds.has(id)) continue
          merged.push({
            id,
            name: r.name,
            address: r.address,
            lat: r.lat,
            lng: r.lng,
            hours: r.hours ?? '',
            daysOpen: r.daysOpen ?? '',
            phone: r.phone ?? '',
            website: r.website ?? '',
            requiresId: r.requiresId ?? false,
            walkIn: r.walkIn ?? false,
            notes: r.notes ?? '',
          })
        }

        resources[type] = merged
      }

      backupData.cities[city.slug] = {
        config,
        resources,
      }
    }
    return backupData
  } else {
    // JSON-based export
    const backupData: any = {
      exportedAt: new Date().toISOString(),
      cities: {},
    }

    const files = await readdir(CONFIG_DIR)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const slug = file.replace('.json', '')

      try {
        const config = JSON.parse(await readFile(join(CONFIG_DIR, file), 'utf-8'))
        let resources = { food: [] }
        try {
          resources = JSON.parse(
            await readFile(join(DATA_DIR, slug, 'resources.json'), 'utf-8')
          )
        } catch {}

        backupData.cities[slug] = { config, resources }
      } catch {}
    }
    return backupData
  }
}
