import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONFIG_DIR = path.join(__dirname, '../config/cities')
const DATA_DIR = path.join(__dirname, '../data')

let errors = 0
let warnings = 0

function error(msg) {
  console.error(`❌ ${msg}`)
  errors += 1
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`)
  warnings += 1
}

function success(msg) {
  console.log(`✓ ${msg}`)
}

console.log('🔍 Validating Our New Bridge Configuration\n')

if (!fs.existsSync(CONFIG_DIR)) {
  error(`Config directory not found: ${CONFIG_DIR}`)
  process.exit(1)
}

const cityFiles = fs.readdirSync(CONFIG_DIR).filter((f) => f.endsWith('.json'))

if (cityFiles.length === 0) {
  warn('No city configuration files found in config/cities/')
}

console.log(`Found ${cityFiles.length} city configuration(s)\n`)

cityFiles.forEach((file) => {
  const cityName = file.replace('.json', '')
  console.log(`📍 Checking ${cityName}...`)

  try {
    const configPath = path.join(CONFIG_DIR, file)
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

    const required = ['slug', 'city', 'map']
    const missing = required.filter((field) => !config[field])

    if (missing.length > 0) {
      error(`  Missing required fields: ${missing.join(', ')}`)
    } else {
      success(`  ${file} is valid`)
    }

    const resourcePath = path.join(DATA_DIR, config.slug, 'resources.json')
    if (!fs.existsSync(resourcePath)) {
      warn(`  No resources.json found at data/${config.slug}/resources.json`)
    } else {
      const resources = JSON.parse(fs.readFileSync(resourcePath, 'utf8'))
      const foodCount = resources.food?.length || 0
      success(`  Found ${foodCount} food locations`)

      ;(resources.food || []).forEach((resource, idx) => {
        if (!resource.id) error(`    Resource ${idx} missing 'id'`)
        if (!resource.name) error(`    Resource ${idx} missing 'name'`)
        if (!resource.address) error(`    Resource ${idx} missing 'address'`)
        if (!resource.lat || !resource.lng) warn(`    Resource ${idx} missing coordinates`)
      })
    }
  } catch (err) {
    error(`  ${file} - ${err.message}`)
  }

  console.log('')
})

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
if (errors === 0 && warnings === 0) {
  console.log('✅ All configurations are valid!\n')
  process.exit(0)
} else {
  console.log(`\n${errors} error(s), ${warnings} warning(s)\n`)
  process.exit(errors > 0 ? 1 : 0)
}
