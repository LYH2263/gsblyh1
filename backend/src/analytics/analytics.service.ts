import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { RecordEntity } from '../records/record.entity';
import { Dataset } from '../datasets/dataset.entity';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
    @InjectRepository(Dataset)
    private readonly datasetRepository: Repository<Dataset>
  ) {}

  async summary(userId: number, datasetId: number, query: QueryAnalyticsDto) {
    await this.assertDatasetOwnership(userId, datasetId);
    const qb = this.applyFilters(
      this.recordRepository
        .createQueryBuilder('record')
        .where('record.datasetId = :datasetId', { datasetId }),
      query
    );

    const raw = await qb
      .select('COALESCE(SUM(record.amount), 0)', 'totalAmount')
      .addSelect('COUNT(record.id)', 'count')
      .getRawOne<{ totalAmount: string; count: string }>();

    const totalAmount = Number(raw?.totalAmount ?? 0);
    const count = Number(raw?.count ?? 0);
    const avg = count > 0 ? Number((totalAmount / count).toFixed(2)) : 0;

    const compareValue = await this.calculateCompareValue(datasetId, query, totalAmount);

    return {
      totalAmount,
      count,
      avg,
      compareValue
    };
  }

  async trend(userId: number, datasetId: number, query: QueryAnalyticsDto) {
    await this.assertDatasetOwnership(userId, datasetId);

    const qb = this.applyFilters(
      this.recordRepository
        .createQueryBuilder('record')
        .where('record.datasetId = :datasetId', { datasetId }),
      query
    );

    const rows = await qb
      .select('record.date', 'date')
      .addSelect('COALESCE(SUM(record.amount), 0)', 'value')
      .groupBy('record.date')
      .orderBy('record.date', 'ASC')
      .getRawMany<{ date: string; value: string }>();

    return rows.map((row) => ({
      date: row.date,
      value: Number(row.value)
    }));
  }

  async top(userId: number, datasetId: number, query: QueryAnalyticsDto) {
    await this.assertDatasetOwnership(userId, datasetId);

    const groupBy = query.by ?? 'category';
    const limit = query.limit ?? 10;

    const qb = this.applyFilters(
      this.recordRepository
        .createQueryBuilder('record')
        .where('record.datasetId = :datasetId', { datasetId }),
      query
    );

    const rows = await qb
      .select(`record.${groupBy}`, 'name')
      .addSelect('COALESCE(SUM(record.amount), 0)', 'value')
      .groupBy(`record.${groupBy}`)
      .orderBy('value', 'DESC')
      .limit(limit)
      .getRawMany<{ name: string; value: string }>();

    return rows.map((row) => ({ name: row.name, value: Number(row.value) }));
  }

  async pie(userId: number, datasetId: number, query: QueryAnalyticsDto) {
    return this.top(userId, datasetId, {
      ...query,
      by: query.by ?? 'channel',
      limit: 100
    });
  }

  private applyFilters(
    qb: SelectQueryBuilder<RecordEntity>,
    query: QueryAnalyticsDto
  ): SelectQueryBuilder<RecordEntity> {
    if (query.from) {
      qb.andWhere('record.date >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('record.date <= :to', { to: query.to });
    }
    if (query.category) {
      qb.andWhere('record.category = :category', { category: query.category });
    }
    if (query.region) {
      qb.andWhere('record.region = :region', { region: query.region });
    }
    if (query.channel) {
      qb.andWhere('record.channel = :channel', { channel: query.channel });
    }

    return qb;
  }

  private async assertDatasetOwnership(
    userId: number,
    datasetId: number
  ): Promise<void> {
    const dataset = await this.datasetRepository.findOne({
      where: { id: datasetId, userId }
    });

    if (!dataset) {
      throw new NotFoundException('数据集不存在');
    }
  }

  private async calculateCompareValue(
    datasetId: number,
    query: QueryAnalyticsDto,
    currentTotalAmount: number
  ): Promise<number> {
    if (!query.from || !query.to) {
      return 0;
    }

    const fromDate = new Date(query.from);
    const toDate = new Date(query.to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return 0;
    }

    const dayMillis = 1000 * 60 * 60 * 24;
    const days = Math.max(
      1,
      Math.floor((toDate.getTime() - fromDate.getTime()) / dayMillis) + 1
    );

    const prevTo = new Date(fromDate.getTime() - dayMillis);
    const prevFrom = new Date(prevTo.getTime() - (days - 1) * dayMillis);

    const fmt = (date: Date) => date.toISOString().slice(0, 10);

    const previousQuery: QueryAnalyticsDto = {
      ...query,
      from: fmt(prevFrom),
      to: fmt(prevTo)
    };

    const qb = this.applyFilters(
      this.recordRepository
        .createQueryBuilder('record')
        .where('record.datasetId = :datasetId', { datasetId }),
      previousQuery
    );

    const raw = await qb
      .select('COALESCE(SUM(record.amount), 0)', 'totalAmount')
      .getRawOne<{ totalAmount: string }>();

    const previousTotal = Number(raw?.totalAmount ?? 0);

    if (previousTotal === 0) {
      return currentTotalAmount > 0 ? 100 : 0;
    }

    return Number(
      (((currentTotalAmount - previousTotal) / previousTotal) * 100).toFixed(2)
    );
  }
}
