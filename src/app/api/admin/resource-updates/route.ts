import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getPrismaClient, USE_DATABASE } from '@/lib/db-utils'
import { canReviewResourceUpdate, getAdminAccessForSessionUser } from '@/lib/permissions'

export async function GET() {
  const session = await getServerSession(authOptions)
  const access = await getAdminAccessForSessionUser(session?.user)
  if (!access.isAdmin) {
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
    const allowedCitySlugs = Array.from(new Set([
      ...access.citySlugs,
      ...access.locationScopes.map((scope) => scope.citySlug),
    ]))

    if (!access.isSuperAdmin && allowedCitySlugs.length === 0) {
      return NextResponse.json([])
    }

    const updates = await prismaClient.resourceUpdateRequest.findMany({
      where: {
        status: 'pending',
        ...(access.isSuperAdmin ? {} : { citySlug: { in: allowedCitySlugs } }),
      },
      orderBy: { submittedAt: 'desc' },
    })

    const filteredUpdates = updates.filter((update) =>
      canReviewResourceUpdate(access, update.citySlug, update.resourceExternalId)
    )

    return NextResponse.json(filteredUpdates)
  } catch (error) {
    console.error('Failed to load resource updates:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load updates' },
      { status: 500 }
    )
  }
}
