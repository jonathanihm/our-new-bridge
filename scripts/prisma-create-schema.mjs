import { spawnSync } from 'node:child_process'

function normalizeMaybeQuoted(value) {
  if (!value) return undefined
  const trimmed = String(value).trim()
  if (!trimmed) return undefined
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const unquoted = trimmed.slice(1, -1).trim()
    return unquoted || undefined
  }
  return trimmed
}

const resolvedDatabaseUrl =
  normalizeMaybeQuoted(process.env.DATABASE_URL) ||
  normalizeMaybeQuoted(process.env.POSTGRES_PRISMA_URL) ||
  normalizeMaybeQuoted(process.env.POSTGRES_URL) ||
  normalizeMaybeQuoted(process.env.DIRECT_URL)

if (!resolvedDatabaseUrl) {
  console.error('Missing DATABASE_URL (or DIRECT_URL). Set it before creating schema.')
  process.exit(1)
}

process.env.DATABASE_URL = resolvedDatabaseUrl

const useShell = process.platform === 'win32'
const result = useShell
  ? spawnSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      env: process.env,
      shell: true,
    })
  : spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
      stdio: 'inherit',
      env: process.env,
    })

if (result.error) {
  console.error('Failed to create database schema:', result.error.message)
}

process.exit(result.status ?? 1)
