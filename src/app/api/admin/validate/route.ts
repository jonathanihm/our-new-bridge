import { NextRequest, NextResponse } from 'next/server'
import { validateConfig } from '@/lib/db-utils'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

function checkAuth(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return false
  }
  const token = auth.slice(7)
  return token === ADMIN_PASSWORD
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { results, errors } = await validateConfig()
    return NextResponse.json({ results, errors })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to validate configuration' },
      { status: 500 }
    )
  }
}
