import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { validateConfig } from '@/lib/db-utils'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.name !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
