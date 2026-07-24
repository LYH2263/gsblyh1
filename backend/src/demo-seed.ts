import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Dataset } from './datasets/dataset.entity';
import { RecordEntity } from './records/record.entity';
import {
  DEFAULT_DB_PATH,
  DEFAULT_SEED_PASSWORD,
  DEFAULT_SEED_USERNAME,
  MARKETING_DATASET_NAME,
  QUALITY_DATASET_NAME,
  SALES_DATASET_NAME,
  marketingRecords,
  qualityRecords,
  salesRecords,
  seedWithDataSource
} from './scripts/seed-utils';
import { User } from './users/user.entity';
import { QualityTask } from './quality/quality-task.entity';
import { QualityReport } from './quality/quality-report.entity';
import { QualityIssue } from './quality/quality-issue.entity';

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const DEMO_DATASET_COUNTS = new Map([
  [SALES_DATASET_NAME, salesRecords.length],
  [MARKETING_DATASET_NAME, marketingRecords.length],
  [QUALITY_DATASET_NAME, qualityRecords.length]
]);

export const shouldAutoSeedOnBoot = (rawValue?: string, nodeEnv = process.env.NODE_ENV): boolean => {
  if (nodeEnv === 'test') {
    return false;
  }

  const normalizedValue = rawValue?.trim().toLowerCase();

  if (normalizedValue) {
    return TRUTHY_VALUES.has(normalizedValue);
  }

  return nodeEnv !== 'production';
};

const hasExpectedDatasetSnapshot = async (dataSource: DataSource, userId: number): Promise<boolean> => {
  const datasetRepository = dataSource.getRepository(Dataset);
  const recordRepository = dataSource.getRepository(RecordEntity);
  const datasets = await datasetRepository.find({
    where: { userId }
  });

  for (const [name, expectedCount] of DEMO_DATASET_COUNTS) {
    const dataset = datasets.find((item) => item.name === name);

    if (!dataset) {
      return false;
    }

    const actualCount = await recordRepository.count({
      where: { datasetId: dataset.id }
    });

    if (actualCount !== expectedCount) {
      return false;
    }
  }

  return true;
};

export const needsDemoSeed = async (
  dataSource: DataSource,
  username: string,
  password: string
): Promise<boolean> => {
  const userRepository = dataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: { username }
  });

  if (!user) {
    return true;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return true;
  }

  return !(await hasExpectedDatasetSnapshot(dataSource, user.id));
};

export async function ensureDemoSeededOnBoot(options: {
  enabled?: boolean;
  dbPath?: string;
  username?: string;
  password?: string;
} = {}): Promise<{ seeded: boolean; username?: string }> {
  if (!options.enabled) {
    return { seeded: false };
  }

  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;

  if (dbPath === ':memory:') {
    return { seeded: false };
  }

  const username = options.username ?? DEFAULT_SEED_USERNAME;
  const password = options.password ?? DEFAULT_SEED_PASSWORD;
  const dataSource = new DataSource({
    type: 'sqlite',
    database: dbPath,
    entities: [User, Dataset, RecordEntity, QualityTask, QualityReport, QualityIssue],
    synchronize: true
  });

  await dataSource.initialize();

  try {
    const shouldSeed = await needsDemoSeed(dataSource, username, password);

    if (!shouldSeed) {
      return { seeded: false, username };
    }

    const result = await seedWithDataSource(dataSource, {
      username,
      password
    });

    return {
      seeded: true,
      username: result.username
    };
  } finally {
    await dataSource.destroy();
  }
}
