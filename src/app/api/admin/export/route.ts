import { NextRequest, NextResponse } from 'next/server'
import { exportData } from '@/lib/db-utils'
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