import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user?: {
      name?: string | null
      email?: string | null
      image?: string | null
      role?: 'admin' | 'contributor'
    }
  }

  interface User {
    role?: 'admin' | 'contributor'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'admin' | 'contributor'
  }
}
