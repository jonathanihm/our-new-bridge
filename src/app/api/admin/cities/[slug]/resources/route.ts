import { NextRequest, NextResponse } from 'next/server'
import { getResourcesByCity, upsertResource } from '@/lib/db-utils'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

function checkAuth(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return false
  }
  const token = auth.slice(7)
  return token === ADMIN_PASSWORD
}

export async function GET(
  request: NextRequest,
  ctx: { params: any }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { slug } = await ctx.params
    const resources = await getResourcesByCity(slug)

    return NextResponse.json({
      food: resources.map((r: any) => ({
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
      })),
    })
  } catch (error) {
    return NextResponse.json({ food: [] })
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: any }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { slug } = await ctx.params
    const body = await request.json()
    const { id, name, address, lat, lng, hours, daysOpen, phone, requiresId, walkIn, notes } = body

    if (!id || !name || !address) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, address' },
        { status: 400 }
      )
    }

    // Convert string numbers to actual numbers
    const parsedLat = lat ? parseFloat(String(lat)) : null
    const parsedLng = lng ? parseFloat(String(lng)) : null

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
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save resource' },
      { status: 500 }
    )
  }
}
