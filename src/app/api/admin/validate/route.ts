import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { validateConfig } from '@/lib/db-utils'
import { authOptions } from '@/lib/auth'
import { getAdminAccessForSessionUser } from '@/lib/permissions'

export async function GET() {
  const session = await getServerSession(authOptions)
  const access = await getAdminAccessForSessionUser(session?.user)
  if (!access.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!access.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { results, errors } = await validateConfig()
    return NextResponse.json({ results, errors })
  } catch {
    return NextResponse.json(
      { error: 'Failed to validate configuration' },
      { status: 500 }
    )
  }
}
