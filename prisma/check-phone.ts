import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true, whatsappPhone: true },
  });

  console.log('📱 Teléfonos de WhatsApp guardados en la BD:');
  console.table(tenants);
}

main().finally(() => prisma.$disconnect());
