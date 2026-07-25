import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHashSuperAdmin = await bcrypt.hash('admin123', 10);
  const passwordHashEnergym = await bcrypt.hash('Energym123.', 10);

  let tenant = await prisma.tenant.findFirst({ where: { slug: 'energym' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Energym',
        slug: 'energym',
        isActive: true,
      },
    });
  }

  // SuperAdmin User "gimnasios"
  const superAdmin = await prisma.staff.upsert({
    where: { email: 'gimnasios' },
    update: { passwordHash: passwordHashSuperAdmin, role: 'SUPERADMIN' },
    create: {
      tenantId: tenant.id,
      name: 'Super Admin',
      email: 'gimnasios',
      passwordHash: passwordHashSuperAdmin,
      role: 'SUPERADMIN',
    },
  });

  // Energym Owner User "Energym"
  const energymOwner = await prisma.staff.upsert({
    where: { email: 'Energym' },
    update: { passwordHash: passwordHashEnergym, role: 'OWNER' },
    create: {
      tenantId: tenant.id,
      name: 'Energym Owner',
      email: 'Energym',
      passwordHash: passwordHashEnergym,
      role: 'OWNER',
    },
  });

  console.log('✅ Credenciales Actualizadas:');
  console.log(`👑 SUPERADMIN: usuario: gimnasios | password: admin123`);
  console.log(`🏋️ ENERGYM:    usuario: Energym   | password: Energym123.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
