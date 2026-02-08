import { NextRequest, NextResponse } from 'next/server'
import { exportData } from '@/lib/db-utils'

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
    const data = await exportData()
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Content-Disposition': 'attachment; filename="our-new-bridge-backup.json"',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export data' },
      { status: 500 }
    )
  }
}