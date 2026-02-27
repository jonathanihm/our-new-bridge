import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { timingSafeEqual } from 'crypto'
import type { Account, Profile } from 'next-auth'
import { getAdminAccessForEmail, type AdminRole } from '@/lib/permissions'
import { getPrismaClient, USE_DATABASE } from '@/lib/db-utils'

type Credentials = Record<string, string> | undefined

type TokenRole = AdminRole | 'user'

function passwordsMatch(input: string, expected: string) {
  const inputBuffer = Buffer.from(input)
  const expectedBuffer = Buffer.from(expected)
  if (inputBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(inputBuffer, expectedBuffer)
}

async function trackGoogleOAuthUser(user: { email?: string | null; name?: string | null; image?: string | null }, account?: Account | null, profile?: Profile) {
  if (!USE_DATABASE) return
  if (!account || account.provider !== 'google') return

  const email = user.email?.trim().toLowerCase()
  if (!email) return

  const prismaClient = getPrismaClient()
  if (!prismaClient) return

  const providerAccountId = account.providerAccountId || (typeof profile?.sub === 'string' ? profile.sub : null)
  const oauthUserId = `oauth_${email}`

  await prismaClient.$executeRaw`
    INSERT INTO "OAuthUser" ("id", "email", "name", "image", "provider", "providerAccountId", "firstSignInAt", "lastSignInAt", "createdAt", "updatedAt")
    VALUES (${oauthUserId}, ${email}, ${user.name || null}, ${user.image || null}, ${'google'}, ${providerAccountId}, NOW(), NOW(), NOW(), NOW())
    ON CONFLICT ("email")
    DO UPDATE SET
      "name" = EXCLUDED."name",
      "image" = EXCLUDED."image",
      "provider" = EXCLUDED."provider",
      "providerAccountId" = EXCLUDED."providerAccountId",
      "lastSignInAt" = NOW(),
      "updatedAt" = NOW();
  `
}

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: 'Admin Password',
    credentials: {
      password: { label: 'Password', type: 'password' },
    },
    authorize: async (credentials: Credentials) => {
      const adminPassword = process.env.ADMIN_PASSWORD?.trim()
      const provided = credentials?.password

      if (!adminPassword || !provided) return null
      if (!passwordsMatch(provided, adminPassword)) return null

      return { id: 'admin', name: 'admin' }
    },
  }),
]

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    })
  )
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers,
  pages: { signIn: '/admin' },
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      await trackGoogleOAuthUser(user, account, profile)
      return true
    },
    jwt: async ({ token, user }) => {
      if (user?.name === 'admin') {
        token.role = 'super_admin'
        token.roles = ['super_admin']
        token.isAdmin = true
        token.isSuperAdmin = true
        token.citySlugs = []
        token.locationScopes = []
      } else if (user) {
        token.role = 'user'
      }
      if (user?.email) {
        token.email = user.email
      }
      if (user?.name) {
        token.name = user.name
      }

      const tokenEmail = typeof token.email === 'string' ? token.email : null
      if (tokenEmail) {
        const access = await getAdminAccessForEmail(tokenEmail)
        const primaryRole: TokenRole = access.isSuperAdmin
          ? 'super_admin'
          : access.roles[0] || 'user'

        token.role = primaryRole
        token.roles = access.roles
        token.isAdmin = access.isAdmin
        token.isSuperAdmin = access.isSuperAdmin
        token.citySlugs = access.citySlugs
        token.locationScopes = access.locationScopes
      } else if (token.role !== 'super_admin') {
        token.role = 'user'
        token.roles = []
        token.isAdmin = false
        token.isSuperAdmin = false
        token.citySlugs = []
        token.locationScopes = []
      }

      return token
    },
    session: ({ session, token }) => {
      const role = token?.role === 'super_admin'
        || token?.role === 'city_admin'
        || token?.role === 'local_admin'
        || token?.role === 'user'
        ? token.role
        : undefined

      const roles = Array.isArray(token?.roles)
        ? token.roles.filter((value): value is AdminRole =>
          value === 'super_admin' || value === 'city_admin' || value === 'local_admin'
        )
        : []

      const citySlugs = Array.isArray(token?.citySlugs)
        ? token.citySlugs.filter((value): value is string => typeof value === 'string')
        : []

      const locationScopes = Array.isArray(token?.locationScopes)
        ? token.locationScopes.filter(
          (
            value
          ): value is { citySlug: string; locationId: string } =>
            !!value
            && typeof value === 'object'
            && typeof (value as { citySlug?: unknown }).citySlug === 'string'
            && typeof (value as { locationId?: unknown }).locationId === 'string'
        )
        : []

      session.user = {
        ...(session.user || {}),
        name: token?.name || session.user?.name,
        email: token?.email || session.user?.email,
        role,
        roles,
        isAdmin: Boolean(token?.isAdmin),
        isSuperAdmin: Boolean(token?.isSuperAdmin),
        citySlugs,
        locationScopes,
      }
      return session
    },
  },
}
