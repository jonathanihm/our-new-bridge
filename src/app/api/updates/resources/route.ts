import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getPrismaClient, USE_DATABASE, type ResourceType } from '@/lib/db-utils'

export const runtime = 'nodejs'

type ResourceUpdatePayload = {
  resourceId?: string
  name: string
  address: string
  lat?: number | null
  lng?: number | null
  hours?: string | null
  daysOpen?: string | null
  phone?: string | null
  website?: string | null
  requiresId?: boolean
  walkIn?: boolean
  notes?: string | null
  category?: ResourceType
  availabilityStatus?: 'yes' | 'no' | 'not_sure'
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.isAdmin === true
  const submittedByEmail = session?.user?.email || (isAdmin ? 'admin' : '')

  if (!submittedByEmail) {
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
    const body = (await request.json()) as {
      citySlug?: string
      category?: ResourceType
      payload?: ResourceUpdatePayload
    }

    const citySlug = String(body.citySlug || '').trim()
    const payload = body.payload || ({} as ResourceUpdatePayload)
    const name = String(payload.name || '').trim()
    const address = String(payload.address || '').trim()
    const resourceId = payload.resourceId ? String(payload.resourceId).trim() : undefined
    const category = payload.category || body.category || 'food'

    if (!citySlug || !name || !address) {
      return NextResponse.json(
        { error: 'Missing required fields: citySlug, name, address' },
        { status: 400 }
      )
    }

    const city = await prismaClient.city.findUnique({ where: { slug: citySlug } })
    if (!city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 })
    }

    const changeType = resourceId ? 'update' : 'add'

    const availabilityStatus =
      payload.availabilityStatus === 'yes'
      || payload.availabilityStatus === 'no'
      || payload.availabilityStatus === 'not_sure'
        ? payload.availabilityStatus
        : undefined

    const normalizedPayload: ResourceUpdatePayload = {
      resourceId,
      name,
      address,
      lat: payload.lat ?? null,
      lng: payload.lng ?? null,
      hours: payload.hours || null,
      daysOpen: payload.daysOpen || null,
      phone: payload.phone || null,
      website: payload.website || null,
      requiresId: payload.requiresId ?? false,
      walkIn: payload.walkIn ?? false,
      notes: payload.notes || null,
      category,
      availabilityStatus,
    }

    await prismaClient.resourceUpdateRequest.create({
      data: {
        citySlug,
        resourceExternalId: resourceId || null,
        category,
        changeType,
        payload: normalizedPayload,
        submittedByEmail,
        submittedByName: session?.user?.name || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to submit resource update:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit update' },
      { status: 500 }
    )
  }
}
