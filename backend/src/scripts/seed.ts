import 'reflect-metadata';
import {
  DEFAULT_DB_PATH,
  DEFAULT_SEED_PASSWORD,
  DEFAULT_SEED_USERNAME,
  seedDatabase
} from './seed-utils';

async function main(): Promise<void> {
  const result = await seedDatabase({
    username: process.env.SEED_USERNAME ?? DEFAULT_SEED_USERNAME,
    password: process.env.SEED_PASSWORD ?? DEFAULT_SEED_PASSWORD,
    dbPath: process.env.DB_PATH ?? DEFAULT_DB_PATH
  });

  console.log('[seed] done');
  console.log(`[seed] user: ${result.username}`);

  for (const dataset of result.datasets) {
    console.log(`[seed] dataset ${dataset.datasetId} (${dataset.name}): ${dataset.insertedCount} records`);
  }
}

void main().catch((error: unknown) => {
  console.error('[seed] failed', error);
  process.exit(1);
});
