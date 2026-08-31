import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Dev/staging fixtures only — never use these credentials in production.
const SEED_PASSWORD = 'Senha@123';

async function main() {
  const passwordHash = await argon2.hash(SEED_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gsalas.dev' },
    update: {},
    create: {
      name: 'Administradora G-Salas',
      email: 'admin@gsalas.dev',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const client = await prisma.user.upsert({
    where: { email: 'cliente@gsalas.dev' },
    update: {},
    create: {
      name: 'Ana Beatriz Souza',
      email: 'cliente@gsalas.dev',
      passwordHash,
      role: 'CLIENT',
      status: 'ACTIVE',
      phone: '11999990000',
      professionalProfile: {
        create: {
          profession: 'Psicóloga',
          registrationNumber: 'CRP 06/123456',
          specialties: ['TCC', 'Ansiedade'],
          serviceType: 'PRESENCIAL',
        },
      },
    },
  });

  const room = await prisma.room.upsert({
    where: { id: 'seed-room-1' },
    update: {},
    create: {
      id: 'seed-room-1',
      name: 'Sala Aconchego',
      description: 'Sala climatizada com isolamento acústico.',
      type: 'Atendimento individual',
      capacity: 2,
      amenities: ['Ar-condicionado', 'Isolamento acústico', 'Wi-Fi'],
      status: 'AVAILABLE',
      hourlyPrice: 60,
    },
  });

  await prisma.availability.upsert({
    where: { id: 'seed-availability-1' },
    update: {},
    create: {
      id: 'seed-availability-1',
      roomId: room.id,
      weekday: 1,
      startTime: '08:00',
      endTime: '20:00',
    },
  });

  const plan = await prisma.plan.upsert({
    where: { id: 'seed-plan-1' },
    update: {},
    create: {
      id: 'seed-plan-1',
      name: 'Plano 20h',
      monthlyHours: 20,
      monthlyValue: 1200,
      cancellationLimit: 2,
    },
  });

  const contract = await prisma.contract.upsert({
    where: { id: 'seed-contract-1' },
    update: { userId: client.id },
    create: {
      id: 'seed-contract-1',
      userId: client.id,
      planId: plan.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      monthlyHours: 20,
      cancellationLimit: 2,
      status: 'ACTIVE',
    },
  });

  await prisma.creditWallet.upsert({
    where: { id: 'seed-wallet-1' },
    update: { userId: client.id, contractId: contract.id },
    create: {
      id: 'seed-wallet-1',
      userId: client.id,
      contractId: contract.id,
      balance: 20,
      totalGranted: 20,
      totalUsed: 0,
    },
  });

  console.log('Seed concluído:', { admin: admin.email, client: client.email });
  console.log(`Senha de todos os usuários de seed: ${SEED_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
