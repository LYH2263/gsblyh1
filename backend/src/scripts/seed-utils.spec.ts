import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Dataset } from '../datasets/dataset.entity';
import { RecordEntity } from '../records/record.entity';
import { User } from '../users/user.entity';
import {
  DEFAULT_SEED_PASSWORD,
  DEFAULT_SEED_USERNAME,
  MARKETING_DATASET_NAME,
  SALES_DATASET_NAME,
  marketingRecords,
  salesRecords,
  seedWithDataSource
} from './seed-utils';

describe('seed utilities', () => {
  let dataSource: DataSource;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Dataset, RecordEntity],
      synchronize: true
    });

    await dataSource.initialize();
  });

  afterEach(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('resets the demo user password when the same username already exists', async () => {
    const userRepository = dataSource.getRepository(User);
    const oldPassword = 'old-password';
    const existingUser = await userRepository.save({
      username: DEFAULT_SEED_USERNAME,
      passwordHash: await bcrypt.hash(oldPassword, 10)
    });

    const result = await seedWithDataSource(dataSource);
    const updatedUser = await userRepository.findOneOrFail({
      where: { id: existingUser.id }
    });

    expect(result.username).toBe(DEFAULT_SEED_USERNAME);
    expect(result.userId).toBe(existingUser.id);
    expect(await bcrypt.compare(DEFAULT_SEED_PASSWORD, updatedUser.passwordHash)).toBe(true);
    expect(await bcrypt.compare(oldPassword, updatedUser.passwordHash)).toBe(false);
  });

  it('rebuilds the demo datasets with stable names and record counts', async () => {
    const datasetRepository = dataSource.getRepository(Dataset);
    const recordRepository = dataSource.getRepository(RecordEntity);

    const firstRun = await seedWithDataSource(dataSource);

    expect(firstRun.datasets).toEqual([
      expect.objectContaining({
        name: SALES_DATASET_NAME,
        insertedCount: salesRecords.length
      }),
      expect.objectContaining({
        name: MARKETING_DATASET_NAME,
        insertedCount: marketingRecords.length
      })
    ]);
    expect(await datasetRepository.count()).toBe(2);
    expect(await recordRepository.count()).toBe(salesRecords.length + marketingRecords.length);

    await recordRepository.delete({});

    const secondRun = await seedWithDataSource(dataSource);
    const datasetNames = (await datasetRepository.find()).map((dataset) => dataset.name).sort();

    expect(secondRun.datasets[0].insertedCount).toBe(salesRecords.length);
    expect(secondRun.datasets[1].insertedCount).toBe(marketingRecords.length);
    expect(datasetNames).toEqual([MARKETING_DATASET_NAME, SALES_DATASET_NAME]);
    expect(await datasetRepository.count()).toBe(2);
    expect(await recordRepository.count()).toBe(salesRecords.length + marketingRecords.length);
  });
});
