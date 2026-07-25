import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaultPhone = '593967491847';

  await prisma.tenant.updateMany({
    data: {
      whatsappPhone: defaultPhone,
    },
  });

  console.log(`✅ Todos los gimnasios actualizados con el número de WhatsApp: +${defaultPhone}`);
}

main().finally(() => prisma.$disconnect());
