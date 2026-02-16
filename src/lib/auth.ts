import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { timingSafeEqual } from 'crypto'

type Credentials = Record<string, string> | undefined

function passwordsMatch(input: string, expected: string) {
  const inputBuffer = Buffer.from(input)
  const expectedBuffer = Buffer.from(expected)
  if (inputBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(inputBuffer, expectedBuffer)
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
    jwt: ({ token, user }) => {
      if (user?.name === 'admin') {
        token.role = 'admin'
      } else if (user) {
        token.role = 'contributor'
      }
      if (user?.email) {
        token.email = user.email
      }
      if (user?.name) {
        token.name = user.name
      }
      return token
    },
    session: ({ session, token }) => {
      const role = token?.role === 'admin' || token?.role === 'contributor'
        ? token.role
        : undefined
      session.user = {
        ...(session.user || {}),
        name: token?.name || session.user?.name,
        email: token?.email || session.user?.email,
        role,
      }
      return session
    },
  },
}
