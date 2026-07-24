import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { QualityTask } from './quality-task.entity';
import { QualityReport } from './quality-report.entity';
import { QualityIssue } from './quality-issue.entity';
import { Dataset } from '../datasets/dataset.entity';
import { RecordEntity } from '../records/record.entity';
import { QueryIssuesDto } from './dto/query-issues.dto';
import { RepairIssueDto } from './dto/repair-issue.dto';
import { RepairDuplicatesDto } from './dto/repair-duplicates.dto';
import {
  computeScore,
  defaultDateValue,
  inspectRecords,
  MISSING_DEFAULTS
} from './quality.rules';

@Injectable()
export class QualityService {
  constructor(
    @InjectRepository(QualityTask)
    private readonly taskRepository: Repository<QualityTask>,
    @InjectRepository(QualityReport)
    private readonly reportRepository: Repository<QualityReport>,
    @InjectRepository(QualityIssue)
    private readonly issueRepository: Repository<QualityIssue>,
    @InjectRepository(Dataset)
    private readonly datasetRepository: Repository<Dataset>,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
    private readonly dataSource: DataSource
  ) {}

  async enqueueInspection(
    userId: number,
    datasetId: number
  ): Promise<{ taskId: number }> {
    await this.assertDatasetOwnership(userId, datasetId);

    const task = await this.taskRepository.save({
      userId,
      datasetId,
      status: 'queued',
      error: null,
      reportId: null,
      completedAt: null
    });

    setImmediate(() => {
      void this.runInspection(task.id).catch((err) => {
        console.error('[quality] inspection failed', err);
      });
    });

    return { taskId: task.id };
  }

  private async runInspection(taskId: number): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      return;
    }

    task.status = 'running';
    await this.taskRepository.save(task);

    try {
      const records = await this.recordRepository.find({
        where: { datasetId: task.datasetId },
        order: { id: 'ASC' }
      });

      const detected = inspectRecords(records);
      const issueRecordIds = new Set(detected.map((item) => item.recordId));
      const score = computeScore(records.length, issueRecordIds);

      const counts = {
        missing: 0,
        abnormalAmount: 0,
        futureDate: 0,
        duplicate: 0
      };
      for (const item of detected) {
        if (item.rule === 'missing_field') counts.missing++;
        else if (item.rule === 'abnormal_amount') counts.abnormalAmount++;
        else if (item.rule === 'future_date') counts.futureDate++;
        else if (item.rule === 'duplicate_key') counts.duplicate++;
      }

      await this.dataSource.transaction(async (manager) => {
        const report = manager.create(QualityReport, {
          userId: task.userId,
          datasetId: task.datasetId,
          taskId: task.id,
          score,
          totalRecords: records.length,
          countMissing: counts.missing,
          countAbnormalAmount: counts.abnormalAmount,
          countFutureDate: counts.futureDate,
          countDuplicate: counts.duplicate
        });
        const savedReport = await manager.save(report);

        if (detected.length > 0) {
          const issueEntities = detected.map((item) =>
            manager.create(QualityIssue, {
              reportId: savedReport.id,
              userId: task.userId,
              datasetId: task.datasetId,
              recordId: item.recordId,
              rule: item.rule,
              field: item.field ?? null,
              summary: item.summary,
              detail: item.detail ?? null,
              status: 'open'
            })
          );
          await manager.save(issueEntities, { chunk: 100 });
        }

        task.status = 'done';
        task.reportId = savedReport.id;
        task.completedAt = new Date();
        task.error = null;
        await manager.save(task);
      });
    } catch (err) {
      task.status = 'failed';
      task.error = err instanceof Error ? err.message : '巡检执行失败';
      task.completedAt = new Date();
      await this.taskRepository.save(task);
    }
  }

  async getTask(userId: number, taskId: number): Promise<QualityTask> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task || task.userId !== userId) {
      throw new NotFoundException('巡检任务不存在');
    }
    return task;
  }

  async getLatestReport(
    userId: number,
    datasetId: number
  ): Promise<QualityReport | null> {
    await this.assertDatasetOwnership(userId, datasetId);
    return this.reportRepository.findOne({
      where: { userId, datasetId },
      order: { createdAt: 'DESC' }
    });
  }

  async getReport(userId: number, reportId: number): Promise<QualityReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId }
    });
    if (!report || report.userId !== userId) {
      throw new NotFoundException('巡检报告不存在');
    }
    return report;
  }

  async listIssues(
    userId: number,
    reportId: number,
    query: QueryIssuesDto
  ): Promise<{
    items: QualityIssue[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    await this.getReport(userId, reportId);

    const qb = this.issueRepository
      .createQueryBuilder('issue')
      .where('issue.reportId = :reportId', { reportId });

    if (query.rule) {
      qb.andWhere('issue.rule = :rule', { rule: query.rule });
    }
    if (query.status) {
      qb.andWhere('issue.status = :status', { status: query.status });
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [items, total] = await qb
      .orderBy('issue.rule', 'ASC')
      .addOrderBy('issue.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, total, page, pageSize };
  }

  async getWarnings(
    userId: number,
    datasetId: number
  ): Promise<{ reportId: number | null; issues: QualityIssue[] }> {
    await this.assertDatasetOwnership(userId, datasetId);
    const report = await this.reportRepository.findOne({
      where: { userId, datasetId },
      order: { createdAt: 'DESC' }
    });

    if (!report) {
      return { reportId: null, issues: [] };
    }

    const issues = await this.issueRepository.find({
      where: { reportId: report.id, status: 'open' }
    });

    return { reportId: report.id, issues };
  }

  async repairIssue(
    userId: number,
    issueId: number,
    dto: RepairIssueDto
  ): Promise<{ id: number; status: string }> {
    const issue = await this.issueRepository.findOne({ where: { id: issueId } });
    if (!issue || issue.userId !== userId) {
      throw new NotFoundException('问题项不存在');
    }
    if (issue.status === 'fixed') {
      return { id: issue.id, status: 'fixed' };
    }

    const record = await this.recordRepository.findOne({
      where: { id: issue.recordId, datasetId: issue.datasetId }
    });
    if (!record) {
      throw new NotFoundException('对应记录已不存在');
    }

    if (issue.rule === 'missing_field' && dto.action === 'fill_default') {
      const field = issue.field;
      if (!field) {
        throw new BadRequestException('该缺失问题未关联字段');
      }
      if (field === 'date') {
        record.date = dto.defaultValue?.trim() || defaultDateValue();
      } else if (field === 'category') {
        record.category = dto.defaultValue?.trim() || MISSING_DEFAULTS.category;
      } else if (field === 'region') {
        record.region = dto.defaultValue?.trim() || MISSING_DEFAULTS.region;
      } else if (field === 'channel') {
        record.channel = dto.defaultValue?.trim() || MISSING_DEFAULTS.channel;
      } else {
        throw new BadRequestException(`未知字段 ${field}`);
      }
      await this.recordRepository.save(record);
    } else if (issue.rule === 'abnormal_amount' && dto.action === 'amount_abs') {
      record.amount = Math.abs(record.amount);
      if (record.amount === 0) {
        record.amount = 0;
      }
      await this.recordRepository.save(record);
    } else {
      throw new BadRequestException(
        `规则 ${issue.rule} 不支持操作 ${dto.action}`
      );
    }

    issue.status = 'fixed';
    issue.fixedAt = new Date();
    await this.issueRepository.save(issue);

    return { id: issue.id, status: 'fixed' };
  }

  async repairDuplicates(
    userId: number,
    reportId: number,
    dto: RepairDuplicatesDto
  ): Promise<{ fixedCount: number; deletedRecordIds: number[] }> {
    await this.getReport(userId, reportId);

    const issues = await this.issueRepository
      .createQueryBuilder('issue')
      .where('issue.reportId = :reportId', { reportId })
      .andWhere('issue.id IN (:...ids)', { ids: dto.issueIds })
      .andWhere('issue.rule = :rule', { rule: 'duplicate_key' })
      .getMany();

    if (issues.length === 0) {
      throw new BadRequestException('未找到可删除的重复问题项');
    }

    const recordIds = issues.map((item) => item.recordId);
    const userOwnedRecords = await this.recordRepository
      .createQueryBuilder('record')
      .innerJoin(Dataset, 'dataset', 'dataset.id = record.datasetId')
      .where('record.id IN (:...recordIds)', { recordIds })
      .andWhere('dataset.userId = :userId', { userId })
      .getMany();

    if (userOwnedRecords.length !== recordIds.length) {
      throw new BadRequestException('部分记录不属于当前用户');
    }

    await this.recordRepository.delete(recordIds);

    const now = new Date();
    for (const issue of issues) {
      issue.status = 'fixed';
      issue.fixedAt = now;
    }
    await this.issueRepository.save(issues);

    return { fixedCount: issues.length, deletedRecordIds: recordIds };
  }

  async repairBatch(
    userId: number,
    reportId: number,
    rule: 'missing_field' | 'abnormal_amount'
  ): Promise<{ fixedCount: number }> {
    await this.getReport(userId, reportId);

    const issues = await this.issueRepository.find({
      where: { reportId, rule, status: 'open' }
    });

    let fixedCount = 0;
    for (const issue of issues) {
      try {
        await this.repairIssue(userId, issue.id, {
          action: rule === 'missing_field' ? 'fill_default' : 'amount_abs'
        });
        fixedCount++;
      } catch {
        // continue with remaining
      }
    }

    return { fixedCount };
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
