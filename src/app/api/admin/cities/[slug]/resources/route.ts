import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { deleteResource, getResourcesByCity, upsertResource } from '@/lib/db-utils'
import { authOptions } from '@/lib/auth'

type ResourceCategory = 'food' | 'shelter' | 'housing' | 'legal'

function normalizeCategory(value: unknown): ResourceCategory {
  if (value === 'shelter' || value === 'housing' || value === 'legal') return value
  return 'food'
}

export async function GET(
  request: NextRequest,
    ctx: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions)
  if (session?.user?.name !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
      const { slug } = await Promise.resolve(ctx.params)
    const resources = await getResourcesByCity(slug)

    type ResourceLike = {
      id?: string
      externalId?: string
      name?: string
      address?: string
      lat?: number | string | null
      lng?: number | string | null
      hours?: string | null
      daysOpen?: string | null
      phone?: string | null
      requiresId?: boolean | null
      walkIn?: boolean | null
      notes?: string | null
      availabilityStatus?: 'yes' | 'no' | 'not_sure' | null
      lastAvailableAt?: Date | string | null
    }

    return NextResponse.json({
      food: (resources as ResourceLike[]).map((r) => ({
        id: r.externalId || r.id,
        name: r.name,
        address: r.address,
        lat: r.lat || '',
        lng: r.lng || '',
        hours: r.hours || '',
        daysOpen: r.daysOpen || '',
        phone: r.phone || '',
        requiresId: r.requiresId || false,
        walkIn: r.walkIn || false,
        notes: r.notes || '',
        availabilityStatus: r.availabilityStatus || null,
        lastAvailableAt: r.lastAvailableAt
          ? new Date(r.lastAvailableAt).toISOString()
          : null,
      })),
    })
  } catch {
    return NextResponse.json({ food: [] })
  }
}

export async function POST(
  request: NextRequest,
    ctx: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions)
  if (session?.user?.name !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
      const { slug } = await Promise.resolve(ctx.params)
    const body = await request.json()
    const {
      id,
      name,
      address,
      lat,
      lng,
      hours,
      daysOpen,
      phone,
      requiresId,
      walkIn,
      notes,
      availabilityStatus,
    } = body

    if (!id || !name || !address) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, address' },
        { status: 400 }
      )
    }

    // Convert string numbers to actual numbers
    const parsedLat = lat ? parseFloat(String(lat)) : null
    const parsedLng = lng ? parseFloat(String(lng)) : null

    const normalizedAvailability =
      availabilityStatus === 'yes' || availabilityStatus === 'no' || availabilityStatus === 'not_sure'
        ? availabilityStatus
        : undefined

    await upsertResource(slug, {
      id,
      name,
      address,
      lat: parsedLat,
      lng: parsedLng,
      hours,
      daysOpen,
      phone,
      requiresId,
      walkIn,
      notes,
      availabilityStatus: normalizedAvailability,
      lastAvailableAt: normalizedAvailability === 'yes' ? new Date() : undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save resource' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
    ctx: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions)
  if (session?.user?.name !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
      const { slug } = await Promise.resolve(ctx.params)
    const body = await request.json()
    const { id, category } = body || {}

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
    }

    await deleteResource(String(slug), String(id), normalizeCategory(category))
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete resource' },
      { status: 500 }
    )
  }
}
