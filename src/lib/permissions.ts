import { getPrismaClient, USE_DATABASE } from '@/lib/db-utils'

export type AdminRole = 'super_admin' | 'city_admin' | 'local_admin'
export type AdminScopeType = 'global' | 'city' | 'location'

export type LocationScope = {
  citySlug: string
  locationId: string
}

export type AdminAccess = {
  isAdmin: boolean
  isSuperAdmin: boolean
  roles: AdminRole[]
  citySlugs: string[]
  locationScopes: LocationScope[]
}

type SessionAdminUser = {
  email?: string | null
  isAdmin?: boolean
  isSuperAdmin?: boolean
  roles?: AdminRole[]
  citySlugs?: string[]
  locationScopes?: LocationScope[]
}

type AdminAssignmentRow = {
  role: string
  scopeType: string
  citySlug: string | null
  locationId: string | null
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function parseSuperAdminEmails() {
  const raw = process.env.SUPER_ADMIN_EMAILS || ''
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
}

function isAdminRole(role: string): role is AdminRole {
  return role === 'super_admin' || role === 'city_admin' || role === 'local_admin'
}

function isScopeType(scopeType: string): scopeType is AdminScopeType {
  return scopeType === 'global' || scopeType === 'city' || scopeType === 'location'
}

function dedupe<T>(values: T[]) {
  return Array.from(new Set(values))
}

function dedupeLocations(values: LocationScope[]) {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = `${value.citySlug}:${value.locationId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function getAdminAccessForEmail(email?: string | null): Promise<AdminAccess> {
  const base: AdminAccess = {
    isAdmin: false,
    isSuperAdmin: false,
    roles: [],
    citySlugs: [],
    locationScopes: [],
  }

  const normalizedEmail = email ? normalizeEmail(email) : ''
  if (!normalizedEmail) return base

  const superAdminEmails = parseSuperAdminEmails()
  const isEnvSuperAdmin = superAdminEmails.includes(normalizedEmail)

  if (!USE_DATABASE) {
    if (!isEnvSuperAdmin) return base
    return {
      isAdmin: true,
      isSuperAdmin: true,
      roles: ['super_admin'],
      citySlugs: [],
      locationScopes: [],
    }
  }

  const prismaClient = getPrismaClient()
  if (!prismaClient) {
    if (!isEnvSuperAdmin) return base
    return {
      isAdmin: true,
      isSuperAdmin: true,
      roles: ['super_admin'],
      citySlugs: [],
      locationScopes: [],
    }
  }

  const assignments = await prismaClient.$queryRaw<AdminAssignmentRow[]>`
    SELECT "role", "scopeType", "citySlug", "locationId"
    FROM "AdminRoleAssignment"
    WHERE LOWER("userEmail") = ${normalizedEmail}
  `

  const roles = assignments
    .map((assignment: AdminAssignmentRow) => assignment.role)
    .filter((role): role is AdminRole => isAdminRole(String(role)))

  const isDbSuperAdmin = assignments.some(
    (assignment: AdminAssignmentRow) => assignment.role === 'super_admin' || assignment.scopeType === 'global'
  )

  const citySlugs = assignments
    .filter(
      (assignment: AdminAssignmentRow) =>
        isScopeType(String(assignment.scopeType)) && Boolean(assignment.citySlug)
    )
    .map((assignment: AdminAssignmentRow) => String(assignment.citySlug).toLowerCase())

  const locationScopes = assignments
    .filter(
      (assignment: AdminAssignmentRow) =>
        assignment.scopeType === 'location' && Boolean(assignment.citySlug) && Boolean(assignment.locationId)
    )
    .map((assignment: AdminAssignmentRow) => ({
      citySlug: String(assignment.citySlug).toLowerCase(),
      locationId: String(assignment.locationId),
    }))

  const resolvedRoles = dedupe<AdminRole>([
    ...(isEnvSuperAdmin ? ['super_admin' as const] : []),
    ...roles,
  ])

  return {
    isAdmin: isEnvSuperAdmin || isDbSuperAdmin || resolvedRoles.length > 0,
    isSuperAdmin: isEnvSuperAdmin || isDbSuperAdmin,
    roles: resolvedRoles,
    citySlugs: dedupe(citySlugs),
    locationScopes: dedupeLocations(locationScopes),
  }
}

export async function getAdminAccessForSessionUser(
  user?: SessionAdminUser | null
): Promise<AdminAccess> {
  if (user?.isSuperAdmin) {
    return {
      isAdmin: true,
      isSuperAdmin: true,
      roles: ['super_admin'],
      citySlugs: [],
      locationScopes: [],
    }
  }

  const emailAccess = await getAdminAccessForEmail(user?.email)
  if (emailAccess.isAdmin) {
    return emailAccess
  }

  const roles = Array.isArray(user?.roles)
    ? user.roles.filter(
      (role): role is AdminRole =>
        role === 'super_admin' || role === 'city_admin' || role === 'local_admin'
    )
    : []

  const citySlugs = Array.isArray(user?.citySlugs)
    ? user.citySlugs.filter((slug): slug is string => typeof slug === 'string')
    : []

  const locationScopes = Array.isArray(user?.locationScopes)
    ? user.locationScopes.filter(
      (scope): scope is LocationScope =>
        !!scope
        && typeof scope === 'object'
        && typeof scope.citySlug === 'string'
        && typeof scope.locationId === 'string'
    )
    : []

  const isAdmin = user?.isAdmin === true || roles.length > 0

  return {
    isAdmin,
    isSuperAdmin: false,
    roles,
    citySlugs,
    locationScopes,
  }
}

export function canManageCity(access: AdminAccess, citySlug: string) {
  if (access.isSuperAdmin) return true
  const normalizedSlug = citySlug.toLowerCase()
  return access.citySlugs.includes(normalizedSlug) && access.roles.includes('city_admin')
}

export function canManageLocation(access: AdminAccess, citySlug: string, locationId: string) {
  if (access.isSuperAdmin) return true
  const normalizedSlug = citySlug.toLowerCase()

  if (canManageCity(access, normalizedSlug)) return true

  return access.locationScopes.some(
    (scope) => scope.citySlug === normalizedSlug && scope.locationId === locationId
  )
}

export function canReviewResourceUpdate(
  access: AdminAccess,
  citySlug: string,
  resourceExternalId?: string | null
) {
  if (access.isSuperAdmin) return true
  if (!resourceExternalId) {
    return canManageCity(access, citySlug)
  }
  return canManageLocation(access, citySlug, resourceExternalId)
}
