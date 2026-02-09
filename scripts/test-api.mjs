const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
const adminPassword = process.env.ADMIN_PASSWORD

if (!adminPassword) {
  console.error('ADMIN_PASSWORD env var is required')
  process.exit(1)
}

const cookieJar = new Map()

function storeCookies(setCookieHeaders) {
  if (!setCookieHeaders || setCookieHeaders.length === 0) return
  for (const header of setCookieHeaders) {
    const [cookie] = header.split(';')
    const [name, ...valueParts] = cookie.split('=')
    if (!name) continue
    cookieJar.set(name.trim(), valueParts.join('=').trim())
  }
}

function cookieHeader() {
  if (cookieJar.size === 0) return ''
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

async function requestJson(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Cookie: cookieHeader(),
    },
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { res, json, text }
}

async function getCsrfToken() {
  const res = await fetch(`${baseUrl}/api/auth/csrf`, {
    headers: { Cookie: cookieHeader() },
  })
  const json = await res.json()
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean)
  storeCookies(setCookie)
  return json.csrfToken
}

async function signIn() {
  const csrfToken = await getCsrfToken()
  const body = new URLSearchParams({
    csrfToken,
    password: adminPassword,
    callbackUrl: `${baseUrl}/admin/dashboard`,
    json: 'true',
  })

  const res = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader(),
    },
    body,
    redirect: 'manual',
  })

  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean)
  storeCookies(setCookie)

  if (![200, 302].includes(res.status)) {
    const text = await res.text().catch(() => '')
    throw new Error(`Sign-in failed (${res.status}): ${text}`)
  }
}

async function main() {
  console.log(`Base URL: ${baseUrl}`)
  await signIn()
  console.log('Signed in successfully')

  const validate = await requestJson('/api/admin/validate')
  console.log('GET /api/admin/validate', validate.res.status)

  const cities = await requestJson('/api/admin/cities')
  console.log('GET /api/admin/cities', cities.res.status)

  const exportRes = await requestJson('/api/admin/export')
  console.log('GET /api/admin/export', exportRes.res.status)

  if (!validate.res.ok || !cities.res.ok || !exportRes.res.ok) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
