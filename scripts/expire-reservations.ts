import { ReservationsService } from '../src/modules/reservations/reservations.service.js';
import { prisma } from '../src/config/database.js';

async function run() {
  console.log('Processing expired reservations...');
  const result = await ReservationsService.processExpiredReservations();
  console.log(`Processed ${result.expiredCount} expired reservations.`);
}

run()
  .catch((err) => {
    console.error('Failed to process expired reservations:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
