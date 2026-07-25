import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const energymTenant = await prisma.tenant.findUnique({ where: { slug: 'energym' } });
  const demoTenant = await prisma.tenant.findUnique({ where: { slug: 'fit-retail-demo' } });

  if (!energymTenant || !demoTenant) {
    console.log('Tenants no encontrados');
    return;
  }

  // Assign demo customers, wallets, evaluations, payments, and plans to Energym tenant
  await prisma.customer.updateMany({
    where: { tenantId: demoTenant.id },
    data: { tenantId: energymTenant.id },
  });

  await prisma.wallet.updateMany({
    where: { tenantId: demoTenant.id },
    data: { tenantId: energymTenant.id },
  });

  await prisma.evaluation.updateMany({
    where: { tenantId: demoTenant.id },
    data: { tenantId: energymTenant.id },
  });

  await prisma.payment.updateMany({
    where: { tenantId: demoTenant.id },
    data: { tenantId: energymTenant.id },
  });

  await prisma.membershipPlan.updateMany({
    where: { tenantId: demoTenant.id },
    data: { tenantId: energymTenant.id },
  });

  await prisma.staff.updateMany({
    where: { tenantId: demoTenant.id },
    data: { tenantId: energymTenant.id },
  });

  console.log('✅ Todos los datos de prueba transferidos exitosamente a Energym!');
}

main().finally(() => prisma.$disconnect());
