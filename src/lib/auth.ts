import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { timingSafeEqual } from 'crypto'

type Credentials = Record<string, string> | undefined

function passwordsMatch(input: string, expected: string) {
  const inputBuffer = Buffer.from(input)
  const expectedBuffer = Buffer.from(expected)
  if (inputBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(inputBuffer, expectedBuffer)
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
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
  ],
  pages: { signIn: '/admin' },
  callbacks: {
    session: ({ session, token }) => {
      if (token?.sub === 'admin') {
        session.user = { ...(session.user || {}), name: 'admin' }
      }
      return session
    },
  },
}
