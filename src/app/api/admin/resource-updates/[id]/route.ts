import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getPrismaClient, USE_DATABASE, upsertResource, type ResourceType } from '@/lib/db-utils'
import { canReviewResourceUpdate, getAdminAccessForSessionUser } from '@/lib/permissions'

export async function PATCH(
  request: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> }
) {
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
    const { id } = await Promise.resolve(ctx.params)
    const body = (await request.json()) as { action?: 'approve' | 'reject'; note?: string }
    const action = body.action

    if (!action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const updateRequest = await prismaClient.resourceUpdateRequest.findUnique({
      where: { id },
    })

    if (!updateRequest) {
      return NextResponse.json({ error: 'Update request not found' }, { status: 404 })
    }

    if (!canReviewResourceUpdate(access, updateRequest.citySlug, updateRequest.resourceExternalId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (updateRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Update request already processed' }, { status: 400 })
    }

    const reviewerEmail = session?.user?.email || 'system'

    if (action === 'approve') {
      const payload = updateRequest.payload as Record<string, unknown>
      const name = String(payload.name || '').trim()
      const address = String(payload.address || '').trim()

      if (!name || !address) {
        return NextResponse.json({ error: 'Invalid payload: name and address required' }, { status: 400 })
      }

      const parsedLat = payload.lat !== undefined && payload.lat !== null
        ? Number(payload.lat)
        : null
      const parsedLng = payload.lng !== undefined && payload.lng !== null
        ? Number(payload.lng)
        : null
      const availabilityStatus = payload.availabilityStatus === 'yes'
        || payload.availabilityStatus === 'no'
        || payload.availabilityStatus === 'not_sure'
          ? payload.availabilityStatus
          : undefined

      await upsertResource(updateRequest.citySlug, {
        id: updateRequest.resourceExternalId || (payload.resourceId ? String(payload.resourceId) : undefined),
        category: updateRequest.category as ResourceType,
        name,
        address,
        lat: Number.isNaN(parsedLat) ? null : parsedLat,
        lng: Number.isNaN(parsedLng) ? null : parsedLng,
        hours: payload.hours ? String(payload.hours) : null,
        daysOpen: payload.daysOpen ? String(payload.daysOpen) : null,
        phone: payload.phone ? String(payload.phone) : null,
        website: payload.website ? String(payload.website) : null,
        requiresId: Boolean(payload.requiresId),
        walkIn: Boolean(payload.walkIn),
        notes: payload.notes ? String(payload.notes) : null,
        availabilityStatus,
        lastAvailableAt: availabilityStatus === 'yes' ? new Date() : undefined,
      })

      await prismaClient.resourceUpdateRequest.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedByEmail: reviewerEmail,
          reviewedAt: new Date(),
          reviewNote: body.note || null,
        },
      })

      return NextResponse.json({ success: true })
    }

    await prismaClient.resourceUpdateRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedByEmail: reviewerEmail,
        reviewedAt: new Date(),
        reviewNote: body.note || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to resolve resource update:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve update' },
      { status: 500 }
    )
  }
}
