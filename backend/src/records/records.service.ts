import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordEntity } from './record.entity';
import { CreateRecordDto } from './dto/create-record.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { QueryRecordsDto } from './dto/query-records.dto';
import { Dataset } from '../datasets/dataset.entity';

@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
    @InjectRepository(Dataset)
    private readonly datasetRepository: Repository<Dataset>
  ) {}

  async listByDataset(
    userId: number,
    datasetId: number,
    query: QueryRecordsDto
  ): Promise<{
    items: RecordEntity[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    await this.assertDatasetOwnership(userId, datasetId);

    const qb = this.recordRepository
      .createQueryBuilder('record')
      .where('record.datasetId = :datasetId', { datasetId });

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

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const [items, total] = await qb
      .orderBy('record.date', 'DESC')
      .addOrderBy('record.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, total, page, pageSize };
  }

  async create(
    userId: number,
    datasetId: number,
    dto: CreateRecordDto
  ): Promise<RecordEntity> {
    await this.assertDatasetOwnership(userId, datasetId);
    return this.recordRepository.save({
      datasetId,
      date: dto.date,
      category: dto.category,
      amount: dto.amount,
      region: dto.region,
      channel: dto.channel
    });
  }

  async bulkImport(
    userId: number,
    datasetId: number,
    dto: BulkImportDto
  ): Promise<{ insertedCount: number }> {
    await this.assertDatasetOwnership(userId, datasetId);

    const lines = dto.csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new BadRequestException('CSV 文本为空');
    }

    const firstLineColumns = lines[0].split(',').map((item) => item.trim());
    const hasHeader =
      firstLineColumns.length >= 5 &&
      firstLineColumns[0].toLowerCase() === 'date' &&
      firstLineColumns[1].toLowerCase() === 'category';

    const payloadLines = hasHeader ? lines.slice(1) : lines;

    if (payloadLines.length === 0) {
      throw new BadRequestException('CSV 文本中没有数据行');
    }

    const entities: Omit<RecordEntity, 'id' | 'createdAt' | 'dataset'>[] = [];

    payloadLines.forEach((line, index) => {
      const [date, category, amountRaw, region, channel] = line
        .split(',')
        .map((item) => item.trim());

      if (!date || !category || !amountRaw || !region || !channel) {
        throw new BadRequestException(`第 ${index + 1} 行 CSV 格式无效`);
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException(`第 ${index + 1} 行日期格式无效`);
      }

      const amount = Number(amountRaw);

      if (!Number.isFinite(amount) || amount < 0) {
        throw new BadRequestException(`第 ${index + 1} 行金额无效`);
      }

      entities.push({
        datasetId,
        date,
        category,
        amount,
        region,
        channel
      });
    });

    await this.recordRepository.save(entities);

    return { insertedCount: entities.length };
  }

  async remove(userId: number, recordId: number): Promise<{ id: number }> {
    const record = await this.recordRepository
      .createQueryBuilder('record')
      .innerJoin(Dataset, 'dataset', 'dataset.id = record.datasetId')
      .where('record.id = :recordId', { recordId })
      .andWhere('dataset.userId = :userId', { userId })
      .select('record.id', 'id')
      .getRawOne<{ id: number }>();

    if (!record) {
      throw new NotFoundException('记录不存在');
    }

    await this.recordRepository.delete(recordId);
    return { id: recordId };
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
}
