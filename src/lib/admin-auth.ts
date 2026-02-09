import type { NextRequest } from 'next/server'

export function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD?.trim()
  if (!password) {
    throw new Error('ADMIN_PASSWORD is not set')
  }
  return password
}

export function checkAdminAuth(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return false
  }
  const token = auth.slice(7)
  return token === getAdminPassword()
}
