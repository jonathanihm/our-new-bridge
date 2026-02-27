import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getPrismaClient, USE_DATABASE } from '@/lib/db-utils'
import { getAdminAccessForSessionUser } from '@/lib/permissions'

type AdminRole = 'super_admin' | 'city_admin' | 'local_admin'

type CreatePermissionBody = {
  userEmail?: string
  role?: AdminRole
  citySlug?: string
  locationId?: string
}

type ExistingUser = {
  email: string
  name?: string | null
}

type LocationOption = {
  id: string
  label: string
}

type AssignmentRow = {
  id: string
  userEmail: string
  role: AdminRole
  scopeType: 'global' | 'city' | 'location'
  citySlug: string | null
  locationId: string | null
  createdAt: Date
  updatedAt: Date
}

const isValidRole = (role: unknown): role is AdminRole => {
  return role === 'super_admin' || role === 'city_admin' || role === 'local_admin'
}

async function loadExistingUsers() {
  const prismaClient = getPrismaClient()
  if (!prismaClient) return [] as ExistingUser[]

  type OAuthUserRow = { email: string; name: string | null }

  const [oauthUsers, assigned] = await Promise.all([
    prismaClient.$queryRaw<OAuthUserRow[]>`
      SELECT "email", "name"
      FROM "OAuthUser"
      ORDER BY "email" ASC
    `,
    prismaClient.$queryRaw<Array<{ userEmail: string }>>`
      SELECT DISTINCT "userEmail"
      FROM "AdminRoleAssignment"
      ORDER BY "userEmail" ASC
    `,
  ])

  const byEmail = new Map<string, ExistingUser>()

  for (const row of oauthUsers) {
    const email = row.email.trim().toLowerCase()
    if (!email) continue
    byEmail.set(email, { email, name: row.name || null })
  }

  for (const row of assigned) {
    const email = row.userEmail.trim().toLowerCase()
    if (!email) continue
    if (!byEmail.has(email)) {
      byEmail.set(email, { email, name: null })
    }
  }

  return Array.from(byEmail.values()).sort((a, b) => a.email.localeCompare(b.email))
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const access = await getAdminAccessForSessionUser(session?.user)

  if (!access.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!access.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!USE_DATABASE) {
    return NextResponse.json(
      { error: 'Database mode is required for permissions.' },
      { status: 400 }
    )
  }

  const prismaClient = getPrismaClient()
  if (!prismaClient) {
    return NextResponse.json({ error: 'Database connection is not available.' }, { status: 500 })
  }

  const [assignments, cities, users, resources] = await Promise.all([
    prismaClient.$queryRaw<AssignmentRow[]>`
      SELECT "id", "userEmail", "role", "scopeType", "citySlug", "locationId", "createdAt", "updatedAt"
      FROM "AdminRoleAssignment"
      ORDER BY "userEmail" ASC, "role" ASC, "citySlug" ASC NULLS FIRST, "locationId" ASC NULLS FIRST
    `,
    prismaClient.city.findMany({
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    }),
    loadExistingUsers(),
    prismaClient.resource.findMany({
      select: {
        externalId: true,
        name: true,
        city: {
          select: {
            slug: true,
          },
        },
      },
      orderBy: [{ city: { slug: 'asc' } }, { name: 'asc' }],
    }),
  ])

  const locationsByCity = resources.reduce<Record<string, LocationOption[]>>((acc, resource) => {
    const citySlug = resource.city.slug
    if (!acc[citySlug]) {
      acc[citySlug] = []
    }
    acc[citySlug].push({
      id: resource.externalId,
      label: `${resource.name} (${resource.externalId})`,
    })
    return acc
  }, {})

  return NextResponse.json({ assignments, cities, users, locationsByCity })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const access = await getAdminAccessForSessionUser(session?.user)

  if (!access.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!access.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!USE_DATABASE) {
    return NextResponse.json(
      { error: 'Database mode is required for permissions.' },
      { status: 400 }
    )
  }

  const prismaClient = getPrismaClient()
  if (!prismaClient) {
    return NextResponse.json({ error: 'Database connection is not available.' }, { status: 500 })
  }

  try {
    const body = (await request.json()) as CreatePermissionBody
    const userEmail = String(body.userEmail || '').trim().toLowerCase()
    const role = body.role
    const citySlug = body.citySlug ? String(body.citySlug).trim().toLowerCase() : null
    const locationId = body.locationId ? String(body.locationId).trim() : null

    if (!userEmail) {
      return NextResponse.json({ error: 'userEmail is required' }, { status: 400 })
    }

    const existingUsers = await loadExistingUsers()
    const userExists = existingUsers.some((user) => user.email === userEmail)
    if (!userExists) {
      return NextResponse.json(
        { error: 'User must already exist in the system before assigning permissions' },
        { status: 400 }
      )
    }

    if (!isValidRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    if ((role === 'city_admin' || role === 'local_admin') && !citySlug) {
      return NextResponse.json({ error: 'citySlug is required for this role' }, { status: 400 })
    }
    if (role === 'local_admin' && !locationId) {
      return NextResponse.json({ error: 'locationId is required for local_admin' }, { status: 400 })
    }

    if (citySlug) {
      const city = await prismaClient.city.findUnique({ where: { slug: citySlug } })
      if (!city) {
        return NextResponse.json({ error: 'City not found' }, { status: 404 })
      }
    }

    if (role === 'local_admin' && citySlug && locationId) {
      const resource = await prismaClient.resource.findFirst({
        where: {
          city: { slug: citySlug },
          externalId: locationId,
        },
        select: { id: true },
      })

      if (!resource) {
        return NextResponse.json(
          { error: 'Selected location does not exist in the selected city' },
          { status: 400 }
        )
      }
    }

    const scopeType = role === 'super_admin'
      ? 'global'
      : role === 'city_admin'
        ? 'city'
        : 'location'

    const normalizedCitySlug = role === 'super_admin' ? null : citySlug
    const normalizedLocationId = role === 'local_admin' ? locationId : null

    const existing = await prismaClient.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "AdminRoleAssignment"
      WHERE "userEmail" = ${userEmail}
        AND "role" = CAST(${role} AS "AdminRole")
        AND "scopeType" = CAST(${scopeType} AS "AdminScopeType")
        AND (
          (${normalizedCitySlug} IS NULL AND "citySlug" IS NULL)
          OR "citySlug" = ${normalizedCitySlug}
        )
        AND (
          (${normalizedLocationId} IS NULL AND "locationId" IS NULL)
          OR "locationId" = ${normalizedLocationId}
        )
      LIMIT 1
    `

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Permission already exists' }, { status: 409 })
    }

    const assignmentId = randomUUID()

    await prismaClient.$executeRaw`
      INSERT INTO "AdminRoleAssignment" (
        "id", "userEmail", "role", "scopeType", "citySlug", "locationId", "createdAt", "updatedAt"
      ) VALUES (
        ${assignmentId}, ${userEmail}, CAST(${role} AS "AdminRole"), CAST(${scopeType} AS "AdminScopeType"), ${normalizedCitySlug}, ${normalizedLocationId}, NOW(), NOW()
      )
    `

    const assignment = await prismaClient.$queryRaw<AssignmentRow[]>`
      SELECT "id", "userEmail", "role", "scopeType", "citySlug", "locationId", "createdAt", "updatedAt"
      FROM "AdminRoleAssignment"
      WHERE "id" = ${assignmentId}
      LIMIT 1
    `

    return NextResponse.json({ assignment: assignment[0] }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add permission'
    if (message.includes('duplicate key')) {
      return NextResponse.json({ error: 'Permission already exists' }, { status: 409 })
    }
    console.error('Failed to add permission:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
