import { NextRequest, NextResponse } from 'next/server'
import { getCities, createCity, deleteCity } from '@/lib/db-utils'
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
    const cities = await getCities()

    type CityLike = {
      slug: string
      name: string
      state?: string | null
      _count?: { resources?: number }
      resources?: unknown[]
    }

    return NextResponse.json(
      (cities as CityLike[]).map((c) => ({
        slug: c.slug,
        name: c.name,
        state: c.state || '',
        resourceCount: c._count?.resources ?? c.resources?.length ?? 0,
        hasResourceFile: (c._count?.resources ?? c.resources?.length ?? 0) > 0,
      }))
    )
  } catch (error) {
    console.error('getCities error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read cities' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { slug, city, map } = body

    if (!slug || !city?.name || !map?.centerLat || !map?.centerLng) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, city.name, map.centerLat, map.centerLng' },
        { status: 400 }
      )
    }

    const newCity = await createCity({
      slug,
      name: city.name,
      state: city.state || '',
      centerLat: parseFloat(map.centerLat),
      centerLng: parseFloat(map.centerLng),
    })

    return NextResponse.json({ success: true, slug: newCity.slug })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create city' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const body = await request.json()
    const { slug } = body || {}

    if (!slug) {
      return NextResponse.json({ error: 'Missing required field: slug' }, { status: 400 })
    }

    await deleteCity(String(slug))
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete city' },
      { status: 500 }
    )
  }
}
