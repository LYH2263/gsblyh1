import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InspectionTask } from './inspection-task.entity';
import {
  InspectionReport,
  IssueCounts,
  QualityIssue
} from './inspection-report.entity';
import { RecordEntity } from '../records/record.entity';
import { Dataset } from '../datasets/dataset.entity';

const DEFAULT_MISSING_CATEGORY = '未分类';
const DEFAULT_MISSING_REGION = '未知地区';
const DEFAULT_MISSING_CHANNEL = '未知渠道';
const DEFAULT_MISSING_DATE = '1970-01-01';
const AMOUNT_UPPER_BOUND = 1e7;

interface InspectContext {
  userId: number;
  datasetId: number;
  task: InspectionTask;
}

@Injectable()
export class QualityService {
  constructor(
    @InjectRepository(InspectionTask)
    private readonly taskRepository: Repository<InspectionTask>,
    @InjectRepository(InspectionReport)
    private readonly reportRepository: Repository<InspectionReport>,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
    @InjectRepository(Dataset)
    private readonly datasetRepository: Repository<Dataset>
  ) {}

  async startInspection(
    userId: number,
    datasetId: number
  ): Promise<{ taskId: number }> {
    await this.assertDatasetOwnership(userId, datasetId);

    const recordCount = await this.recordRepository.count({
      where: { datasetId }
    });
    if (recordCount === 0) {
      throw new BadRequestException('该数据集暂无数据，无法启动巡检');
    }

    const task = this.taskRepository.create({
      userId,
      datasetId,
      status: 'queued'
    });
    const saved = await this.taskRepository.save(task);

    setImmediate(() => {
      void this.runInspection({ userId, datasetId, task: saved });
    });

    return { taskId: saved.id };
  }

  async getTask(
    userId: number,
    taskId: number
  ): Promise<InspectionTask> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, userId }
    });
    if (!task) {
      throw new NotFoundException('巡检任务不存在');
    }
    return task;
  }

  async getReport(
    userId: number,
    taskId: number
  ): Promise<InspectionReport> {
    const task = await this.getTask(userId, taskId);
    if (task.status !== 'done' || !task.reportId) {
      throw new NotFoundException('巡检报告尚未生成');
    }
    const report = await this.reportRepository.findOne({
      where: { id: task.reportId, userId }
    });
    if (!report) {
      throw new NotFoundException('巡检报告不存在');
    }
    return report;
  }

  async getLatestReport(
    userId: number,
    datasetId: number
  ): Promise<InspectionReport | null> {
    const report = await this.reportRepository.findOne({
      where: { userId, datasetId },
      order: { createdAt: 'DESC' }
    });
    return report ?? null;
  }

  async getReportIssues(
    userId: number,
    taskId: number,
    query: { rule?: string; page: number; pageSize: number }
  ): Promise<{
    items: QualityIssue[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const report = await this.getReport(userId, taskId);

    let filtered = report.issues;
    if (query.rule) {
      filtered = filtered.filter((i) => i.rule === query.rule);
    }

    const total = filtered.length;
    const page = query.page;
    const pageSize = query.pageSize;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return { items, total, page, pageSize };
  }

  async getFlaggedRecordIds(
    userId: number,
    datasetId: number
  ): Promise<number[]> {
    await this.assertDatasetOwnership(userId, datasetId);
    const report = await this.reportRepository.findOne({
      where: { userId, datasetId },
      order: { createdAt: 'DESC' }
    });
    if (!report) {
      return [];
    }
    return report.issues.map((i) => i.recordId);
  }

  async fixMissing(
    userId: number,
    datasetId: number,
    recordIds: number[]
  ): Promise<{ fixedCount: number }> {
    await this.assertDatasetOwnership(userId, datasetId);
    if (!recordIds || recordIds.length === 0) {
      throw new BadRequestException('未选择需要修复的记录');
    }

    const records = await this.recordRepository.find({
      where: { id: In(recordIds), datasetId }
    });

    let fixedCount = 0;
    for (const rec of records) {
      let changed = false;
      if (!rec.category || !rec.category.trim()) {
        rec.category = DEFAULT_MISSING_CATEGORY;
        changed = true;
      }
      if (!rec.region || !rec.region.trim()) {
        rec.region = DEFAULT_MISSING_REGION;
        changed = true;
      }
      if (!rec.channel || !rec.channel.trim()) {
        rec.channel = DEFAULT_MISSING_CHANNEL;
        changed = true;
      }
      if (!rec.date || !rec.date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(rec.date.trim())) {
        rec.date = DEFAULT_MISSING_DATE;
        changed = true;
      }
      if (changed) {
        fixedCount++;
      }
    }

    if (fixedCount > 0) {
      await this.recordRepository.save(records);
    }

    return { fixedCount };
  }

  async fixAbnormalAmounts(
    userId: number,
    datasetId: number,
    recordIds: number[]
  ): Promise<{ fixedCount: number }> {
    await this.assertDatasetOwnership(userId, datasetId);
    if (!recordIds || recordIds.length === 0) {
      throw new BadRequestException('未选择需要修复的记录');
    }

    const records = await this.recordRepository.find({
      where: { id: In(recordIds), datasetId }
    });

    let fixedCount = 0;
    for (const rec of records) {
      if (rec.amount <= 0 || rec.amount > AMOUNT_UPPER_BOUND) {
        rec.amount = Math.abs(rec.amount);
        if (rec.amount === 0) {
          rec.amount = 0.01;
        }
        if (rec.amount > AMOUNT_UPPER_BOUND) {
          rec.amount = AMOUNT_UPPER_BOUND;
        }
        fixedCount++;
      }
    }

    if (fixedCount > 0) {
      await this.recordRepository.save(records);
    }

    return { fixedCount };
  }

  async fixDuplicates(
    userId: number,
    datasetId: number,
    recordIds: number[]
  ): Promise<{ deletedCount: number }> {
    await this.assertDatasetOwnership(userId, datasetId);
    if (!recordIds || recordIds.length === 0) {
      throw new BadRequestException('未选择需要删除的重复记录');
    }

    const result = await this.recordRepository
      .createQueryBuilder()
      .delete()
      .from(RecordEntity)
      .where('id IN (:...recordIds)', { recordIds })
      .andWhere('datasetId = :datasetId', { datasetId })
      .execute();

    return { deletedCount: result.affected ?? 0 };
  }

  private async runInspection(ctx: InspectContext): Promise<void> {
    const { userId, datasetId, task } = ctx;

    try {
      task.status = 'running';
      await this.taskRepository.save(task);

      const records = await this.recordRepository.find({
        where: { datasetId },
        order: { id: 'ASC' }
      });

      if (records.length === 0) {
        throw new Error('数据集为空');
      }

      const issues: QualityIssue[] = [];
      const counts: IssueCounts = {
        missing: 0,
        abnormalAmount: 0,
        futureDate: 0,
        duplicate: 0
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const keyGroups = new Map<string, { earliestId: number; ids: number[] }>();

      for (const rec of records) {
        const missingFields: string[] = [];
        if (!rec.category || !rec.category.trim()) missingFields.push('category');
        if (!rec.region || !rec.region.trim()) missingFields.push('region');
        if (!rec.channel || !rec.channel.trim()) missingFields.push('channel');
        if (!rec.date || !rec.date.trim()) missingFields.push('date');

        if (missingFields.length > 0) {
          counts.missing++;
          issues.push({
            recordId: rec.id,
            rule: 'missing',
            field: missingFields.join(','),
            summary: `字段缺失：${missingFields.join('、')}`
          });
        }

        if (rec.amount <= 0 || rec.amount > AMOUNT_UPPER_BOUND) {
          counts.abnormalAmount++;
          issues.push({
            recordId: rec.id,
            rule: 'abnormal_amount',
            field: 'amount',
            summary: `异常金额：${rec.amount}（应 > 0 且 ≤ ${AMOUNT_UPPER_BOUND}）`
          });
        }

        const dateStr = (rec.date || '').trim();
        if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const d = new Date(dateStr + 'T00:00:00');
          if (!isNaN(d.getTime()) && d > today) {
            counts.futureDate++;
            issues.push({
              recordId: rec.id,
              rule: 'future_date',
              field: 'date',
              summary: `未来日期：${dateStr}（晚于今日）`
            });
          }
        }

        if (dateStr && rec.category && rec.region && rec.channel) {
          const key = `${dateStr}|${rec.category.trim()}|${rec.region.trim()}|${rec.channel.trim()}`;
          const group = keyGroups.get(key);
          if (group) {
            group.ids.push(rec.id);
          } else {
            keyGroups.set(key, { earliestId: rec.id, ids: [rec.id] });
          }
        }
      }

      for (const group of keyGroups.values()) {
        if (group.ids.length > 1) {
          for (const dupId of group.ids) {
            if (dupId !== group.earliestId) {
              counts.duplicate++;
              issues.push({
                recordId: dupId,
                rule: 'duplicate',
                summary: '重复组合键：date+category+region+channel 与同数据集更早记录重复'
              });
            }
          }
        }
      }

      const totalIssues = issues.length;
      const totalRecords = records.length;
      const cleanRecords = totalRecords - new Set(issues.map((i) => i.recordId)).size;
      const qualityScore = totalRecords > 0
        ? Math.round((cleanRecords / totalRecords) * 100)
        : 100;

      const report = this.reportRepository.create({
        userId,
        datasetId,
        taskId: task.id,
        qualityScore,
        totalRecords,
        issueCounts: counts,
        issues
      });
      const savedReport = await this.reportRepository.save(report);

      task.status = 'done';
      task.reportId = savedReport.id;
      task.errorMessage = undefined;
      await this.taskRepository.save(task);
    } catch (err) {
      task.status = 'failed';
      task.errorMessage = err instanceof Error ? err.message : '巡检执行失败';
      await this.taskRepository.save(task);
    }
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
