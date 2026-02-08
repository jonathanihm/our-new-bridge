import { NextRequest, NextResponse } from 'next/server'
import { getCities, createCity } from '@/lib/db-utils'

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
    const cities = await getCities()

    return NextResponse.json(
      cities.map((c: any) => ({
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
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
