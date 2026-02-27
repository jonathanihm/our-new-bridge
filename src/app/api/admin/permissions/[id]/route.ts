import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getPrismaClient, USE_DATABASE } from '@/lib/db-utils'
import { getAdminAccessForSessionUser } from '@/lib/permissions'

export async function DELETE(
  request: Request,
  ctx: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const access = await getAdminAccessForSessionUser(session?.user)

  if (!access.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!access.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!USE_DATABASE) {
    return NextResponse.json(
      { error: 'Database mode is required for permissions.' },
      { status: 400 }
    )
  }

  const prismaClient = getPrismaClient()
  if (!prismaClient) {
    return NextResponse.json({ error: 'Database connection is not available.' }, { status: 500 })
  }

  const { id } = await Promise.resolve(ctx.params)
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  await prismaClient.$executeRaw`
    DELETE FROM "AdminRoleAssignment"
    WHERE "id" = ${id}
  `

  return NextResponse.json({ success: true })
}
