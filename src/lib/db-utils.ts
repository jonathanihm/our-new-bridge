import { PrismaClient, ResourceCategory } from '@prisma/client'
import { readdir, readFile, writeFile, rm, unlink } from 'fs/promises'
import { join } from 'path'

const CONFIG_DIR = join(process.cwd(), 'config', 'cities')
const DATA_DIR = join(process.cwd(), 'data')

export type ResourceType = 'food' | 'shelter' | 'housing' | 'legal'

const RESOURCE_TYPES: ResourceType[] = ['food', 'shelter', 'housing', 'legal']

type CityConfigJson = {
  slug?: string
  city?: {
    name?: string
    state?: string
    fullName?: string
    tagline?: string
    description?: string
  }
  map?: {
    centerLat?: number
    centerLng?: number
    defaultZoom?: number
    zoom?: number
    type?: string
  }
  features?: Partial<Record<ResourceType, { enabled?: boolean; title?: string; icon?: string }>>
  contact?: { email?: string; volunteer?: boolean }
  branding?: {
    primaryColor?: string
    secondaryColor?: string
    accentColor?: string
    backgroundColor?: string
  }
}

type ResourceJson = {
  id?: string
  name?: string
  address?: string
  lat?: number | null
  lng?: number | null
  hours?: string | null
  daysOpen?: string | null
  phone?: string | null
  website?: string | null
  requiresId?: boolean
  walkIn?: boolean
  notes?: string | null
  category?: ResourceType
}

type ResourcesJson = Record<ResourceType, ResourceJson[]>

type CitySummary = {
  slug: string
  name: string
  state: string
  centerLat: number
  centerLng: number
  _count: { resources: number }
}

type ValidationResult = {
  city: string
  slug: string
  status: 'healthy' | 'warning' | 'error'
  resourceCount: number
  configIssues: string[]
  resourceIssues: string[]
}

type ExportData = {
  exportedAt: string
  cities: Record<string, { config: CityConfigJson; resources: ResourcesJson }>
}

const emptyResources = (): ResourcesJson => ({
  food: [],
  shelter: [],
  housing: [],
  legal: [],
})

const parseResources = (value: unknown): ResourcesJson => {
  const resources = emptyResources()
  if (!value || typeof value !== 'object') return resources
  const candidate = value as Partial<Record<ResourceType, ResourceJson[]>>
  for (const type of RESOURCE_TYPES) {
    if (Array.isArray(candidate[type])) {
      resources[type] = candidate[type] as ResourceJson[]
    }
  }
  return resources
}

const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/

function assertValidSlug(slug: string) {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error('Invalid city slug')
  }
}

function getDatabaseUrlCandidate() {
  // Common names across hosts:
  // - Supabase/Neon/etc typically use DATABASE_URL
  // - Vercel Postgres often provides POSTGRES_PRISMA_URL / POSTGRES_URL
  const raw =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    // Some setups only provide DIRECT_URL; treat it as a fallback.
    process.env.DIRECT_URL

  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed.length) return undefined

  // GitHub/Vercel env vars sometimes end up with surrounding quotes
  // if the value was copied from a dotenv file.
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1).trim()
      : trimmed

  return unquoted.length ? unquoted : undefined
}

type DataSourceMode = 'database' | 'airtable' | 'json' | 'auto'

function readDataSourceMode(): DataSourceMode {
  const raw = process.env.DATA_SOURCE
  if (!raw) return 'auto'
  const normalized = raw.trim().toLowerCase()
  if (normalized === 'database') return 'database'
  if (normalized === 'airtable') return 'airtable'
  if (normalized === 'json') return 'json'
  return 'auto'
}

// Check if we have a valid Postgres URL (postgresql:// or postgres://)
const isValidDatabaseUrl = (url: string | undefined) => {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:'
  } catch {
    return false
  }
}

const resolvedDatabaseUrl = getDatabaseUrlCandidate()
const dataSourceMode = readDataSourceMode()
export const USE_AIRTABLE = dataSourceMode === 'airtable'
export const USE_DATABASE =
  dataSourceMode === 'database'
    ? true
    : dataSourceMode === 'json'
      ? false
      : USE_AIRTABLE
        ? false
        : isValidDatabaseUrl(resolvedDatabaseUrl)

// Ensure Prisma reads the resolved DB URL even if the host uses a different env var name.
if (USE_DATABASE && resolvedDatabaseUrl && process.env.DATABASE_URL !== resolvedDatabaseUrl) {
  process.env.DATABASE_URL = resolvedDatabaseUrl
}

function isReadOnlyFilesystemError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: unknown }).code
  return code === 'EROFS' || code === 'EPERM' || code === 'EACCES'
}

function jsonWriteNotSupportedMessage() {
  return (
    'This deployment is running in file-based (JSON) mode, but the filesystem is read-only. '
    + 'Hosts like Vercel do not allow writing to project files at runtime. '
    + 'To create/edit cities and resources in production, set DATABASE_URL (or Vercel\'s POSTGRES_PRISMA_URL) to enable database mode.'
  )
}

function airtableWriteNotSupportedMessage() {
  return 'This deployment is running in Airtable mode. Edit data in Airtable instead of the admin UI.'
}

type AirtableRecord<TFields> = { id: string; fields: TFields }
type AirtableResponse<TFields> = { records: AirtableRecord<TFields>[]; offset?: string }

type AirtableCityFields = {
  slug?: string
  name?: string
  state?: string
  fullName?: string
  tagline?: string
  description?: string
  centerLat?: number
  centerLng?: number
  defaultZoom?: number
  mapType?: string
}

type AirtableResourceFields = {
  externalId?: string
  citySlug?: string
  category?: ResourceType
  name?: string
  address?: string
  lat?: number
  lng?: number
  hours?: string
  daysOpen?: string
  phone?: string
  website?: string
  requiresId?: boolean
  walkIn?: boolean
  notes?: string
}

function getAirtableConfig() {
  const apiKey = process.env.AIRTABLE_API_KEY?.trim()
  const baseId = process.env.AIRTABLE_BASE_ID?.trim()
  const citiesTable = process.env.AIRTABLE_CITIES_TABLE?.trim() || 'Cities'
  const resourcesTable = process.env.AIRTABLE_RESOURCES_TABLE?.trim() || 'Resources'

  if (!apiKey || !baseId) {
    throw new Error('AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set for Airtable mode')
  }

  return { apiKey, baseId, citiesTable, resourcesTable }
}

async function fetchAirtableRecords<TFields>(tableName: string, filterByFormula?: string) {
  const { apiKey, baseId } = getAirtableConfig()
  const records: AirtableRecord<TFields>[] = []
  let offset: string | undefined

  do {
    const params = new URLSearchParams()
    if (filterByFormula) params.set('filterByFormula', filterByFormula)
    if (offset) params.set('offset', offset)
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?${params}`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Airtable request failed (${response.status}) for ${tableName}`)
    }

    const data = (await response.json()) as AirtableResponse<TFields>
    records.push(...data.records)
    offset = data.offset
  } while (offset)

  return records
}

async function fetchAirtableCities() {
  const { citiesTable } = getAirtableConfig()
  const records = await fetchAirtableRecords<AirtableCityFields>(citiesTable)
  return records.map((record) => ({
    slug: record.fields.slug || '',
    name: record.fields.name || '',
    state: record.fields.state || '',
    fullName: record.fields.fullName || '',
    tagline: record.fields.tagline || 'Find help. Fast.',
    description: record.fields.description || 'A simple, humane platform for finding essential resources',
    centerLat: Number(record.fields.centerLat || 0),
    centerLng: Number(record.fields.centerLng || 0),
    defaultZoom: Number(record.fields.defaultZoom || 12),
    mapType: record.fields.mapType || 'google',
  }))
}

async function fetchAirtableResourcesByCity(slug: string, type?: ResourceType) {
  const { resourcesTable } = getAirtableConfig()
  const formulaParts = [`{citySlug} = "${slug}"`]
  if (type) {
    formulaParts.push(`{category} = "${type}"`)
  }
  const formula = `AND(${formulaParts.join(',')})`
  const records = await fetchAirtableRecords<AirtableResourceFields>(resourcesTable, formula)

  return records.map((record) => ({
    id: record.fields.externalId || record.id,
    externalId: record.fields.externalId || record.id,
    name: record.fields.name || '',
    address: record.fields.address || '',
    lat: record.fields.lat ?? null,
    lng: record.fields.lng ?? null,
    hours: record.fields.hours || '',
    daysOpen: record.fields.daysOpen || '',
    phone: record.fields.phone || '',
    website: record.fields.website || '',
    requiresId: record.fields.requiresId || false,
    walkIn: record.fields.walkIn || false,
    notes: record.fields.notes || '',
    category: (record.fields.category || 'food') as ResourceType,
  }))
}

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
  } else if (USE_AIRTABLE) {
    const cities = await fetchAirtableCities()
    return cities.map((city) => ({
      slug: city.slug,
      name: city.name,
      state: city.state || '',
      centerLat: city.centerLat,
      centerLng: city.centerLng,
      _count: { resources: 0 },
    }))
  } else {
    // JSON-based
    const files = await readdir(CONFIG_DIR)
    const cities: CitySummary[] = []
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const slug = file.replace('.json', '')
      const config = JSON.parse(await readFile(join(CONFIG_DIR, file), 'utf-8')) as CityConfigJson
      
      // Read resources count
      let resourceCount = 0
      try {
        const resources = parseResources(
          JSON.parse(await readFile(join(DATA_DIR, slug, 'resources.json'), 'utf-8'))
        )
        resourceCount = resources.food.length
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
  assertValidSlug(slug)
  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    const city = await prismaClient.city.findUnique({
      where: { slug },
      include: { resources: true },
    })

    if (!city) return null

    // Prisma City model doesn't currently store map type; normalize return shape
    // so callers can rely on `mapType` existing in both DB and JSON modes.
    const mapType = (city as { mapType?: string }).mapType ?? 'google'
    return { ...city, mapType }
  } else if (USE_AIRTABLE) {
    const cities = await fetchAirtableCities()
    const city = cities.find((c) => c.slug === slug)
    if (!city) return null

    const resources = await fetchAirtableResourcesByCity(slug, 'food')

    return {
      slug: city.slug,
      name: city.name,
      state: city.state || '',
      fullName: city.fullName || '',
      tagline: city.tagline || 'Find help. Fast.',
      description: city.description || 'A simple, humane platform for finding essential resources',
      centerLat: city.centerLat || 0,
      centerLng: city.centerLng || 0,
      defaultZoom: city.defaultZoom || 12,
      mapType: city.mapType || 'google',
      resources,
    }
  } else {
    // JSON-based
    try {
      const config = JSON.parse(
        await readFile(join(CONFIG_DIR, `${slug}.json`), 'utf-8')
      ) as CityConfigJson
      const resources = parseResources(
        JSON.parse(await readFile(join(DATA_DIR, slug, 'resources.json'), 'utf-8'))
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
        resources: resources.food.map((r) => ({
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
        })),
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
  assertValidSlug(data.slug)
  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    return await prismaClient.city.create({ data })
  } else if (USE_AIRTABLE) {
    throw new Error(airtableWriteNotSupportedMessage())
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
    try {
      await writeFile(join(CONFIG_DIR, `${data.slug}.json`), JSON.stringify(config, null, 2))
    } catch (error) {
      if (isReadOnlyFilesystemError(error)) {
        throw new Error(jsonWriteNotSupportedMessage())
      }
      throw error
    }
    return data
  }
}

export async function deleteCity(slug: string) {
  assertValidSlug(slug)
  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    return await prismaClient.city.delete({ where: { slug } })
  } else if (USE_AIRTABLE) {
    throw new Error(airtableWriteNotSupportedMessage())
  }

  // JSON-based
  try {
    await unlink(join(CONFIG_DIR, `${slug}.json`))
  } catch (error) {
    if (!error || typeof error !== 'object' || (error as { code?: string }).code !== 'ENOENT') {
      if (isReadOnlyFilesystemError(error)) {
        throw new Error(jsonWriteNotSupportedMessage())
      }
      throw error
    }
  }

  try {
    await rm(join(DATA_DIR, slug), { recursive: true, force: true })
  } catch (error) {
    if (isReadOnlyFilesystemError(error)) {
      throw new Error(jsonWriteNotSupportedMessage())
    }
    throw error
  }

  return { slug }
}

export async function validateConfig() {
  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    const cities = await prismaClient.city.findMany({
      include: { resources: true },
      orderBy: { name: 'asc' },
    })
    
    const results: ValidationResult[] = []
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
  } else if (USE_AIRTABLE) {
    const results: ValidationResult[] = []
    const errors: string[] = []

    try {
      const cities = await fetchAirtableCities()
      for (const city of cities) {
        const issues: string[] = []
        const resourceIssues: string[] = []

        if (!city.slug) issues.push('Missing slug')
        if (!city.name) issues.push('Missing name')
        if (!city.centerLat) issues.push('Missing centerLat')
        if (!city.centerLng) issues.push('Missing centerLng')

        const resources = await fetchAirtableResourcesByCity(city.slug || '', 'food')
        resources.forEach((r, idx) => {
          if (!r.externalId) resourceIssues.push(`Resource ${idx}: missing id`)
          if (!r.name) resourceIssues.push(`Resource ${idx}: missing name`)
          if (!r.address) resourceIssues.push(`Resource ${idx}: missing address`)
          if (!r.lat || !r.lng) resourceIssues.push(`Resource ${idx}: missing coordinates`)
        })

        results.push({
          city: city.name,
          slug: city.slug,
          status: issues.length === 0 && resourceIssues.length === 0 ? 'healthy' : 'warning',
          resourceCount: resources.length,
          configIssues: issues,
          resourceIssues,
        })
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return { results, errors }
  } else {
    // JSON-based validation
    const results: ValidationResult[] = []
    const errors: string[] = []
    const files = await readdir(CONFIG_DIR)

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const cityName = file.replace('.json', '')

      try {
        const config = JSON.parse(await readFile(join(CONFIG_DIR, file), 'utf-8')) as CityConfigJson
        const issues: string[] = []

        if (!config.slug) issues.push('Missing slug')
        if (!config.city?.name) issues.push('Missing city.name')
        if (!config.map?.centerLat) issues.push('Missing map.centerLat')
        if (!config.map?.centerLng) issues.push('Missing map.centerLng')

        const resourceIssues: string[] = []
        let resourceCount = 0
        try {
          const resources = parseResources(
            JSON.parse(
              await readFile(join(DATA_DIR, config.slug || cityName, 'resources.json'), 'utf-8')
            )
          )
          resourceCount = resources.food.length
          resources.food.forEach((r: ResourceJson, idx: number) => {
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
  assertValidSlug(slug)
  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    return await prismaClient.resource.findMany({
      where: { city: { slug }, category: type as ResourceCategory },
      orderBy: { createdAt: 'desc' },
    })
  } else if (USE_AIRTABLE) {
    return await fetchAirtableResourcesByCity(slug, type)
  } else {
    // JSON-based
    try {
      const parsed = parseResources(
        JSON.parse(await readFile(join(DATA_DIR, slug, 'resources.json'), 'utf-8'))
      )
      return parsed[type]
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
  assertValidSlug(slug)
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
          category: category as ResourceCategory,
          externalId: data.id,
        },
      },
      update: {
        category: category as ResourceCategory,
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
        category: category as ResourceCategory,
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
  } else if (USE_AIRTABLE) {
    throw new Error(airtableWriteNotSupportedMessage())
  } else {
    // JSON-based
    const resourcePath = join(DATA_DIR, slug, 'resources.json')
    let resources = emptyResources()

    try {
      resources = parseResources(JSON.parse(await readFile(resourcePath, 'utf-8')))
    } catch {}

    if (!Array.isArray(resources[category])) resources[category] = []

    // Find and update or add
    // Ensure ID comparison is done on string values, trimmed of whitespace
    const normalizedId = String(data.id).trim()
    const idx = resources[category].findIndex((r) => String(r.id).trim() === normalizedId)
    
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

    try {
      await writeFile(resourcePath, JSON.stringify(resources, null, 2))
    } catch (error) {
      if (isReadOnlyFilesystemError(error)) {
        throw new Error(jsonWriteNotSupportedMessage())
      }
      throw error
    }
    return data
  }
}

export async function deleteResource(slug: string, id: string, category: ResourceType = 'food') {
  assertValidSlug(slug)
  const normalizedId = String(id).trim()

  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    const city = await prismaClient.city.findUnique({ where: { slug } })
    if (!city) throw new Error('City not found')

    return await prismaClient.resource.delete({
      where: {
        cityId_category_externalId: {
          cityId: city.id,
          category: category as ResourceCategory,
          externalId: normalizedId,
        },
      },
    })
  } else if (USE_AIRTABLE) {
    throw new Error(airtableWriteNotSupportedMessage())
  }

  // JSON-based
  const resourcePath = join(DATA_DIR, slug, 'resources.json')
  let resources = emptyResources()

  try {
    resources = parseResources(JSON.parse(await readFile(resourcePath, 'utf-8')))
  } catch {
    // If resources file doesn't exist, treat as empty.
  }

  const list = Array.isArray(resources[category]) ? resources[category] : []
  resources[category] = list.filter((r) => String(r?.id ?? '').trim() !== normalizedId)

  try {
    await writeFile(resourcePath, JSON.stringify(resources, null, 2))
  } catch (error) {
    if (isReadOnlyFilesystemError(error)) {
      throw new Error(jsonWriteNotSupportedMessage())
    }
    throw error
  }

  return { slug, id: normalizedId, category }
}

export async function exportData() {
  if (USE_DATABASE) {
    const prismaClient = getPrismaClient()!
    const cities = await prismaClient.city.findMany({
      include: { resources: true },
      orderBy: { name: 'asc' },
    })

    const backupData: ExportData = {
      exportedAt: new Date().toISOString(),
      cities: {},
    }

    for (const city of cities) {
      // Export schema should match:
      // - config/cities/<slug>.json
      // - data/<slug>/resources.json

      // Use on-disk files as a base if they exist, so we preserve fields
      // not currently stored in the database (features, contact, branding, etc.).
      let configFromDisk: CityConfigJson | null = null
      try {
        configFromDisk = JSON.parse(
          await readFile(join(CONFIG_DIR, `${city.slug}.json`), 'utf-8')
        ) as CityConfigJson
      } catch {}

      let resourcesFromDisk: ResourcesJson | null = null
      try {
        resourcesFromDisk = parseResources(
          JSON.parse(await readFile(join(DATA_DIR, city.slug, 'resources.json'), 'utf-8'))
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

      const resources: ResourcesJson = resourcesFromDisk ?? emptyResources()

      // Merge DB resources into each category array, preserving any extra JSON fields.
      for (const type of RESOURCE_TYPES) {
        const dbById = new Map<string, typeof city.resources[number]>()
        for (const r of city.resources) {
          const cat = String(r.category ?? 'food') as ResourceType
          if (cat !== type) continue
          dbById.set(String(r.externalId), r)
        }

        const merged: ResourceJson[] = []
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
          const cat = String(r.category ?? 'food') as ResourceType
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
  } else if (USE_AIRTABLE) {
    const backupData: ExportData = {
      exportedAt: new Date().toISOString(),
      cities: {},
    }

    const cities = await fetchAirtableCities()
    for (const city of cities) {
      const config: CityConfigJson = {
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
          defaultZoom: city.defaultZoom || 12,
          type: city.mapType || 'google',
        },
      }

      const resources = emptyResources()
      for (const type of RESOURCE_TYPES) {
        const list = await fetchAirtableResourcesByCity(city.slug, type)
        resources[type] = list.map((r) => ({
          id: r.externalId || r.id,
          name: r.name,
          address: r.address,
          lat: r.lat,
          lng: r.lng,
          hours: r.hours || '',
          daysOpen: r.daysOpen || '',
          phone: r.phone || '',
          website: r.website || '',
          requiresId: r.requiresId || false,
          walkIn: r.walkIn || false,
          notes: r.notes || '',
        }))
      }

      backupData.cities[city.slug] = { config, resources }
    }

    return backupData
  } else {
    // JSON-based export
    const backupData: ExportData = {
      exportedAt: new Date().toISOString(),
      cities: {},
    }

    const files = await readdir(CONFIG_DIR)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const slug = file.replace('.json', '')

      try {
        const config = JSON.parse(await readFile(join(CONFIG_DIR, file), 'utf-8')) as CityConfigJson
        let resources = emptyResources()
        try {
          resources = parseResources(
            JSON.parse(await readFile(join(DATA_DIR, slug, 'resources.json'), 'utf-8'))
          )
        } catch {}

        backupData.cities[slug] = { config, resources }
      } catch {}
    }
    return backupData
  }
}
