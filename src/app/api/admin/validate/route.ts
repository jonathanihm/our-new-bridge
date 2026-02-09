import { NextRequest, NextResponse } from 'next/server'
import { validateConfig } from '@/lib/db-utils'
import { checkAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Admin auth not configured' },
      { status: 500 }
    )
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
