import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          customers: true,
          wallets: true,
          evaluations: true,
          payments: true,
          staff: true,
          membershipPlans: true,
        },
      },
    },
  });

  console.log('📊 RESUMEN DE DATOS POR GIMNASIO EN LA BD:');
  console.log(JSON.stringify(tenants, null, 2));
}

main().finally(() => prisma.$disconnect());
