import 'reflect-metadata';
import { mkdirSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { ensureDemoSeededOnBoot, shouldAutoSeedOnBoot } from './demo-seed';

async function bootstrap(): Promise<void> {
  const dbPath = process.env.DB_PATH ?? 'data/insightboard.db';
  if (dbPath !== ':memory:') {
    const resolvedPath = isAbsolute(dbPath) ? dbPath : resolve(process.cwd(), dbPath);
    mkdirSync(dirname(resolvedPath), { recursive: true });
  }

  const autoSeedOnBoot = shouldAutoSeedOnBoot(process.env.AUTO_SEED_ON_BOOT, process.env.NODE_ENV);
  const seedResult = await ensureDemoSeededOnBoot({
    enabled: autoSeedOnBoot,
    dbPath,
    username: process.env.SEED_USERNAME,
    password: process.env.SEED_PASSWORD
  });

  if (seedResult.seeded) {
    console.log(`[demo-seed] restored demo account: ${seedResult.username}`);
  }

  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
