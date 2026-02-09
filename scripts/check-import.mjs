import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  const city = await prisma.city.findUnique({
    where: { slug: 'des-moines' },
    include: { resources: true },
  })

  if (!city) {
    console.log('City not found: des-moines')
  } else {
    console.log('City:', city.name, 'Resources count:', city.resources.length)
    for (const r of city.resources.slice(0, 10)) {
      console.log('-', r.externalId, r.name)
    }
  }

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
