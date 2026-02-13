import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getPrismaClient, USE_DATABASE } from '@/lib/db-utils'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.name !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!USE_DATABASE) {
    return NextResponse.json(
      { error: 'Database mode is required for contributor updates.' },
      { status: 400 }
    )
  }

  const prismaClient = getPrismaClient()
  if (!prismaClient) {
    return NextResponse.json(
      { error: 'Database connection is not available.' },
      { status: 500 }
    )
  }

  try {
    const updates = await prismaClient.resourceUpdateRequest.findMany({
      where: { status: 'pending' },
      orderBy: { submittedAt: 'desc' },
    })

    return NextResponse.json(updates)
  } catch (error) {
    console.error('Failed to load resource updates:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load updates' },
      { status: 500 }
    )
  }
}
