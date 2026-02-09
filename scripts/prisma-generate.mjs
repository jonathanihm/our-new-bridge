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

// Prisma generate typically doesn't need to connect to the DB, but it does
// resolve env("DATABASE_URL") from schema.prisma. Some deployments/builds
// intentionally omit DATABASE_URL (JSON-mode), so we provide a harmless fallback
// to avoid failing generation.
const resolvedDatabaseUrl =
  normalizeMaybeQuoted(process.env.DATABASE_URL) ||
  normalizeMaybeQuoted(process.env.POSTGRES_PRISMA_URL) ||
  normalizeMaybeQuoted(process.env.POSTGRES_URL) ||
  normalizeMaybeQuoted(process.env.DIRECT_URL)

if (!resolvedDatabaseUrl) {
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db?schema=public'
}

const useShell = process.platform === 'win32'
const result = useShell
  ? spawnSync('npx prisma generate', {
      stdio: 'inherit',
      env: process.env,
      shell: true,
    })
  : spawnSync('npx', ['prisma', 'generate'], {
      stdio: 'inherit',
      env: process.env,
    })

if (result.error) {
  console.error('Failed to run Prisma generate:', result.error.message)
}

process.exit(result.status ?? 1)
