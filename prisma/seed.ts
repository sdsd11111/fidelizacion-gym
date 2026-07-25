import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default tenant for Gym & Retail owner
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'energym' },
    update: {},
    create: {
      name: 'Energym',
      slug: 'energym',
      referralCommPct: 15.00,
      inactivityThresholdDays: 14,
    },
  });

  // Create Business Units (GYM and RETAIL)
  const gymBU = await prisma.businessUnit.create({
    data: {
      tenantId: tenant.id,
      name: 'Unidad Gimnasio',
      type: 'GYM',
      isActive: true,
    },
  });

  const retailBU = await prisma.businessUnit.create({
    data: {
      tenantId: tenant.id,
      name: 'Tienda Retail Ropa',
      type: 'RETAIL',
      isActive: true,
    },
  });

  // Create Branches
  const mainGymBranch = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      businessUnitId: gymBU.id,
      name: 'Sucursal Principal Gym',
      address: 'Av. Principal #123',
    },
  });

  const retailBranch = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      businessUnitId: retailBU.id,
      name: 'Sucursal Tienda Retail',
      address: 'Mall Central Local 45',
    },
  });

  // Create Staff: Owner & Trainers
  const passwordHash = await bcrypt.hash('Energym123.', 10);

  const owner = await prisma.staff.upsert({
    where: { email: 'Energym' },
    update: { passwordHash },
    create: {
      tenantId: tenant.id,
      name: 'Energym Owner',
      email: 'Energym',
      passwordHash,
      role: 'OWNER',
      phone: '51987654321',
    },
  });

  const trainer1 = await prisma.staff.create({
    data: {
      tenantId: tenant.id,
      businessUnitId: gymBU.id,
      branchId: mainGymBranch.id,
      name: 'Carlos Entrenador',
      email: 'carlos@gimnasio.com',
      passwordHash,
      role: 'TRAINER',
      phone: '51987654322',
    },
  });

  const trainer2 = await prisma.staff.create({
    data: {
      tenantId: tenant.id,
      businessUnitId: gymBU.id,
      branchId: mainGymBranch.id,
      name: 'María Coach',
      email: 'maria@gimnasio.com',
      passwordHash,
      role: 'TRAINER',
      phone: '51987654323',
    },
  });

  // Create Sample Customer and Wallet
  const customerReferrer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Juan Perez (Referidor)',
      phone: '51999888777',
      email: 'juan@cliente.com',
      membershipActive: true,
      membershipExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lastAttendance: new Date(),
    },
  });

  const customerReferred = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Pedro Gomez (Referido)',
      phone: '51999888666',
      email: 'pedro@cliente.com',
      membershipActive: false,
    },
  });

  const wallet = await prisma.wallet.create({
    data: {
      tenantId: tenant.id,
      customerId: customerReferrer.id,
      balance: 45.00,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      tenantId: tenant.id,
      walletId: wallet.id,
      type: 'CREDIT_COMMISSION',
      amount: 45.00,
      description: 'Comisión por referido Pedro Gomez',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // Create Sample Evaluation for Carlos Trainer
  await prisma.evaluation.create({
    data: {
      tenantId: tenant.id,
      branchId: mainGymBranch.id,
      trainerId: trainer1.id,
      rating: 5,
      comment: 'Excelente rutina personalizada, muy atento',
      qrSlugId: mainGymBranch.id,
    },
  });

  console.log('Seed completed successfully!');
  console.log(`Owner Login Credentials: usuario: Energym | password: Energym123.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
