const { PrismaClient } = require('@prisma/client');

async function verify() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking imported resources...\n');
    
    const resources = await prisma.resource.findMany({
      take: 3,
      select: { 
        externalId: true, 
        name: true, 
        lat: true, 
        lng: true,
        city: { select: { name: true } }
      },
    });
    
    console.log('Sample resources:');
    resources.forEach(r => {
      console.log(`  ${r.city.name} - ${r.externalId}: ${r.name}`);
      console.log(`    Coordinates: lat=${r.lat} (${typeof r.lat}), lng=${r.lng} (${typeof r.lng})`);
    });
    
    const byCity = await prisma.city.findMany({
      select: {
        name: true,
        _count: { select: { resources: true } }
      }
    });
    
    console.log('\nResources by city:');
    byCity.forEach(c => {
      console.log(`  ${c.name}: ${c._count.resources} resources`);
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
