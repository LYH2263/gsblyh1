import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { Dataset } from '../datasets/dataset.entity';
import { RecordEntity } from '../records/record.entity';
import { QualityTask } from '../quality/quality-task.entity';
import { QualityReport } from '../quality/quality-report.entity';
import { QualityIssue } from '../quality/quality-issue.entity';

type SeedRecordInput = {
  date: string;
  category: string;
  region: string;
  channel: string;
  amount: number;
};

export type SeedOptions = {
  username?: string;
  password?: string;
  dbPath?: string;
};

export type SeedDatasetResult = {
  name: string;
  datasetId: number;
  insertedCount: number;
};

export type SeedResult = {
  username: string;
  userId: number;
  datasets: SeedDatasetResult[];
};

export const DEFAULT_SEED_USERNAME = 'test_user';
export const DEFAULT_SEED_PASSWORD = 'test123456';
export const DEFAULT_DB_PATH = 'data/insightboard.db';
export const SALES_DATASET_NAME = '销售样例数据集';
export const SALES_DATASET_DESCRIPTION = '用于仪表盘/数据探索演示的销售样例数据';
export const MARKETING_DATASET_NAME = '营销样例数据集';
export const MARKETING_DATASET_DESCRIPTION = '用于过滤联动与占比分析的投放样例数据';
export const QUALITY_DATASET_NAME = '数据质量巡检演示集';
export const QUALITY_DATASET_DESCRIPTION = '包含缺失字段/异常金额/未来日期/重复组合键等问题，用于巡检与修复端到端验证';

export const salesRecords: SeedRecordInput[] = [
  { date: '2026-01-01', category: '电子产品', region: '华北', channel: '线上', amount: 4200 },
  { date: '2026-01-03', category: '家居', region: '华南', channel: '线下', amount: 1580 },
  { date: '2026-01-06', category: '食品', region: '华东', channel: '线上', amount: 980 },
  { date: '2026-01-09', category: '图书', region: '华西', channel: '线上', amount: 760 },
  { date: '2026-01-12', category: '电子产品', region: '华北', channel: '线下', amount: 2320 },
  { date: '2026-01-15', category: '食品', region: '华南', channel: '线下', amount: 1110 },
  { date: '2026-01-18', category: '运动', region: '华东', channel: '线上', amount: 1890 },
  { date: '2026-01-21', category: '图书', region: '华西', channel: '线下', amount: 540 },
  { date: '2026-01-24', category: '家居', region: '华北', channel: '线上', amount: 1430 },
  { date: '2026-01-27', category: '电子产品', region: '华南', channel: '线上', amount: 3680 },
  { date: '2026-01-29', category: '运动', region: '华西', channel: '线下', amount: 1250 },
  { date: '2026-01-31', category: '食品', region: '华东', channel: '线上', amount: 870 }
];

export const marketingRecords: SeedRecordInput[] = [
  { date: '2026-01-02', category: 'SEM', region: '华北', channel: '付费搜索', amount: 1200 },
  { date: '2026-01-05', category: '社交媒体', region: '华南', channel: '付费社交', amount: 980 },
  { date: '2026-01-08', category: 'KOL', region: '华东', channel: '达人推广', amount: 1500 },
  { date: '2026-01-11', category: '展示广告', region: '华西', channel: '程序化广告', amount: 760 },
  { date: '2026-01-14', category: 'SEM', region: '华北', channel: '付费搜索', amount: 1320 },
  { date: '2026-01-17', category: '社交媒体', region: '华南', channel: '付费社交', amount: 1080 },
  { date: '2026-01-20', category: 'KOL', region: '华东', channel: '达人推广', amount: 1660 },
  { date: '2026-01-23', category: '展示广告', region: '华西', channel: '程序化广告', amount: 820 }
];

export const qualityRecords: SeedRecordInput[] = [
  { date: '2026-02-01', category: '电子产品', region: '华北', channel: '线上', amount: 1000 },
  { date: '2026-02-02', category: '', region: '华南', channel: '线上', amount: 2000 },
  { date: '2026-02-03', category: '家居', region: '', channel: '线下', amount: 1500 },
  { date: '2026-02-04', category: '食品', region: '华东', channel: '', amount: 800 },
  { date: '2026-02-05', category: '图书', region: '华西', channel: '线上', amount: -888 },
  { date: '2026-02-06', category: '运动', region: '华北', channel: '线下', amount: 0 },
  { date: '2026-02-07', category: '电子产品', region: '华南', channel: '线上', amount: 15000000 },
  { date: '2099-12-31', category: '食品', region: '华东', channel: '线上', amount: 666 },
  { date: '2026-02-10', category: '家居', region: '华北', channel: '线上', amount: 1200 },
  { date: '2026-02-10', category: '家居', region: '华北', channel: '线上', amount: 1300 }
];

export async function ensureUser(
  dataSource: DataSource,
  username: string,
  password: string
): Promise<User> {
  const userRepository = dataSource.getRepository(User);
  const existingUser = await userRepository.findOne({
    where: { username }
  });
  const passwordHash = await bcrypt.hash(password, 10);

  if (existingUser) {
    existingUser.passwordHash = passwordHash;
    return userRepository.save(existingUser);
  }

  return userRepository.save({
    username,
    passwordHash
  });
}

export async function reseedDataset(
  dataSource: DataSource,
  userId: number,
  name: string,
  description: string,
  records: SeedRecordInput[]
): Promise<{ datasetId: number; insertedCount: number }> {
  const datasetRepository = dataSource.getRepository(Dataset);
  const recordRepository = dataSource.getRepository(RecordEntity);

  let dataset = await datasetRepository.findOne({
    where: { userId, name }
  });

  if (!dataset) {
    dataset = await datasetRepository.save({
      userId,
      name,
      description
    });
  }

  await recordRepository.delete({ datasetId: dataset.id });

  const entities = records.map((item) =>
    recordRepository.create({
      datasetId: dataset.id,
      date: item.date,
      category: item.category,
      region: item.region,
      channel: item.channel,
      amount: item.amount
    })
  );

  await recordRepository.save(entities);

  return {
    datasetId: dataset.id,
    insertedCount: entities.length
  };
}

export async function seedWithDataSource(
  dataSource: DataSource,
  options: Omit<SeedOptions, 'dbPath'> = {}
): Promise<SeedResult> {
  const username = options.username ?? DEFAULT_SEED_USERNAME;
  const password = options.password ?? DEFAULT_SEED_PASSWORD;
  const user = await ensureUser(dataSource, username, password);

  const salesResult = await reseedDataset(
    dataSource,
    user.id,
    SALES_DATASET_NAME,
    SALES_DATASET_DESCRIPTION,
    salesRecords
  );

  const marketingResult = await reseedDataset(
    dataSource,
    user.id,
    MARKETING_DATASET_NAME,
    MARKETING_DATASET_DESCRIPTION,
    marketingRecords
  );

  const qualityResult = await reseedDataset(
    dataSource,
    user.id,
    QUALITY_DATASET_NAME,
    QUALITY_DATASET_DESCRIPTION,
    qualityRecords
  );

  return {
    username,
    userId: user.id,
    datasets: [
      { name: SALES_DATASET_NAME, ...salesResult },
      { name: MARKETING_DATASET_NAME, ...marketingResult },
      { name: QUALITY_DATASET_NAME, ...qualityResult }
    ]
  };
}

export async function seedDatabase(options: SeedOptions = {}): Promise<SeedResult> {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: options.dbPath ?? DEFAULT_DB_PATH,
    entities: [User, Dataset, RecordEntity, QualityTask, QualityReport, QualityIssue],
    synchronize: true
  });

  await dataSource.initialize();

  try {
    return await seedWithDataSource(dataSource, options);
  } finally {
    await dataSource.destroy();
  }
}
