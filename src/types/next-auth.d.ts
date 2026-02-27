import 'next-auth'
import 'next-auth/jwt'

type AdminRole = 'super_admin' | 'city_admin' | 'local_admin'
type SessionRole = AdminRole | 'user'

type LocationScope = {
  citySlug: string
  locationId: string
}

declare module 'next-auth' {
  interface Session {
    user?: {
      name?: string | null
      email?: string | null
      image?: string | null
      role?: SessionRole
      roles?: AdminRole[]
      isAdmin?: boolean
      isSuperAdmin?: boolean
      citySlugs?: string[]
      locationScopes?: LocationScope[]
    }
  }

  interface User {
    role?: SessionRole
    roles?: AdminRole[]
    isAdmin?: boolean
    isSuperAdmin?: boolean
    citySlugs?: string[]
    locationScopes?: LocationScope[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: SessionRole
    roles?: AdminRole[]
    isAdmin?: boolean
    isSuperAdmin?: boolean
    citySlugs?: string[]
    locationScopes?: LocationScope[]
  }
}
