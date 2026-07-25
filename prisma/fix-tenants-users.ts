import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHashEnergym = await bcrypt.hash('Energym123.', 10);
  const passwordHashAdmin = await bcrypt.hash('admin123', 10);

  // 1. Ensure Tenant "Energym" exists
  let energymTenant = await prisma.tenant.findUnique({ where: { slug: 'energym' } });
  if (!energymTenant) {
    energymTenant = await prisma.tenant.create({
      data: {
        name: 'Energym',
        slug: 'energym',
        isActive: true,
        showOverviewTab: true,
        showEvaluationsTab: true,
        showWalletTab: true,
        showConfigTab: true,
      },
    });
  }

  // 2. Ensure Tenant "Gimnasio & Retail Fideliz" exists
  let mainTenant = await prisma.tenant.findUnique({ where: { slug: 'fit-retail-demo' } });
  if (!mainTenant) {
    mainTenant = await prisma.tenant.create({
      data: {
        name: 'Gimnasio & Retail Fideliz',
        slug: 'fit-retail-demo',
        isActive: true,
      },
    });
  }

  // 3. Fix Staff Energym to belong strictly to energymTenant
  await prisma.staff.upsert({
    where: { email: 'Energym' },
    update: {
      tenantId: energymTenant.id,
      name: 'Energym Owner',
      passwordHash: passwordHashEnergym,
      role: 'OWNER',
    },
    create: {
      tenantId: energymTenant.id,
      name: 'Energym Owner',
      email: 'Energym',
      passwordHash: passwordHashEnergym,
      role: 'OWNER',
    },
  });

  // 4. Fix Staff owner@gimnasio.com to belong strictly to mainTenant
  await prisma.staff.upsert({
    where: { email: 'owner@gimnasio.com' },
    update: {
      tenantId: mainTenant.id,
      name: 'Fideliz Admin',
      passwordHash: passwordHashAdmin,
      role: 'OWNER',
    },
    create: {
      tenantId: mainTenant.id,
      name: 'Fideliz Admin',
      email: 'owner@gimnasio.com',
      passwordHash: passwordHashAdmin,
      role: 'OWNER',
    },
  });

  // 5. Ensure SuperAdmin "gimnasios" exists
  await prisma.staff.upsert({
    where: { email: 'gimnasios' },
    update: {
      tenantId: energymTenant.id,
      name: 'Super Admin',
      passwordHash: passwordHashAdmin,
      role: 'SUPERADMIN',
    },
    create: {
      tenantId: energymTenant.id,
      name: 'Super Admin',
      email: 'gimnasios',
      passwordHash: passwordHashAdmin,
      role: 'SUPERADMIN',
    },
  });

  console.log('✅ Base de datos reestructurada correctamente:');
  console.log(`   - Usuario "Energym" asignado ÚNICAMENTE al tenant "Energym" (${energymTenant.id})`);
  console.log(`   - Usuario "owner@gimnasio.com" asignado al tenant "Gimnasio & Retail Fideliz" (${mainTenant.id})`);
  console.log(`   - Usuario "gimnasios" configurado como SUPERADMIN`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
