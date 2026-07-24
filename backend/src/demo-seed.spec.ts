import * as bcrypt from 'bcrypt';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { Dataset } from './datasets/dataset.entity';
import {
  DEFAULT_SEED_PASSWORD,
  DEFAULT_SEED_USERNAME,
  MARKETING_DATASET_NAME,
  QUALITY_DATASET_NAME,
  SALES_DATASET_NAME,
  marketingRecords,
  qualityRecords,
  salesRecords
} from './scripts/seed-utils';
import { ensureDemoSeededOnBoot, shouldAutoSeedOnBoot } from './demo-seed';
import { RecordEntity } from './records/record.entity';
import { User } from './users/user.entity';
import { QualityTask } from './quality/quality-task.entity';
import { QualityReport } from './quality/quality-report.entity';
import { QualityIssue } from './quality/quality-issue.entity';

const createDataSource = (database: string) =>
  new DataSource({
    type: 'sqlite',
    database,
    entities: [User, Dataset, RecordEntity, QualityTask, QualityReport, QualityIssue],
    synchronize: true
  });

describe('demo seed bootstrap', () => {
  it('enables auto seed by default in development but not in production/test', () => {
    expect(shouldAutoSeedOnBoot(undefined, 'development')).toBe(true);
    expect(shouldAutoSeedOnBoot(undefined, 'production')).toBe(false);
    expect(shouldAutoSeedOnBoot(undefined, 'test')).toBe(false);
    expect(shouldAutoSeedOnBoot('true', 'production')).toBe(true);
    expect(shouldAutoSeedOnBoot('false', 'development')).toBe(false);
  });

  it('restores the demo account and keeps the snapshot stable across restarts', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'insightboard-demo-seed-'));
    const database = join(tempDir, 'demo.db');

    try {
      const firstRun = await ensureDemoSeededOnBoot({
        enabled: true,
        dbPath: database
      });

      expect(firstRun).toEqual({
        seeded: true,
        username: DEFAULT_SEED_USERNAME
      });

      const secondRun = await ensureDemoSeededOnBoot({
        enabled: true,
        dbPath: database
      });

      expect(secondRun).toEqual({
        seeded: false,
        username: DEFAULT_SEED_USERNAME
      });

      const dataSource = createDataSource(database);
      await dataSource.initialize();

      try {
        const userRepository = dataSource.getRepository(User);
        const datasetRepository = dataSource.getRepository(Dataset);
        const recordRepository = dataSource.getRepository(RecordEntity);
        const user = await userRepository.findOne({
          where: { username: DEFAULT_SEED_USERNAME }
        });

        expect(user).toBeTruthy();
        expect(await bcrypt.compare(DEFAULT_SEED_PASSWORD, user!.passwordHash)).toBe(true);

        const datasets = await datasetRepository.find({
          where: { userId: user!.id }
        });
        const salesDataset = datasets.find((item) => item.name === SALES_DATASET_NAME);
        const marketingDataset = datasets.find((item) => item.name === MARKETING_DATASET_NAME);
        const qualityDataset = datasets.find((item) => item.name === QUALITY_DATASET_NAME);

        expect(salesDataset).toBeTruthy();
        expect(marketingDataset).toBeTruthy();
        expect(qualityDataset).toBeTruthy();
        expect(
          await recordRepository.count({
            where: { datasetId: salesDataset!.id }
          })
        ).toBe(salesRecords.length);
        expect(
          await recordRepository.count({
            where: { datasetId: marketingDataset!.id }
          })
        ).toBe(marketingRecords.length);
        expect(
          await recordRepository.count({
            where: { datasetId: qualityDataset!.id }
          })
        ).toBe(qualityRecords.length);
      } finally {
        await dataSource.destroy();
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
