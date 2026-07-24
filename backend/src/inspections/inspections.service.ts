import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RecordEntity } from '../records/record.entity';
import { Dataset } from '../datasets/dataset.entity';
import {
  InspectionTask,
  InspectionStatus
} from './inspection-task.entity';
import {
  InspectionIssue,
  InspectionReport,
  RuleKey
} from './inspection-report.entity';
import {
  AMOUNT_UPPER_LIMIT,
  computeScore,
  RULE_KEYS,
  runRules
} from './rules.engine';
import { QueryIssuesDto } from './dto/query-issues.dto';
import { FixAmountDto, FixDeleteDto, FixMissingDto } from './dto/fix.dto';

interface ReportView {
  id: number;
  datasetId: number;
  taskId: number;
  score: number;
  totalRecords: number;
  issueRecords: number;
  categoryCounts: Record<RuleKey, number>;
  /** 报告中所有存在问题的记录 id（去重），供探索页打标使用 */
  issueRecordIds: number[];
  createdAt: Date;
}

@Injectable()
export class InspectionsService {
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

  /** 提交巡检任务，返回 taskId 与初始状态；巡检异步执行。 */
  async submit(
    userId: number,
    datasetId: number
  ): Promise<{ taskId: number; status: InspectionStatus }> {
    await this.assertDatasetOwnership(userId, datasetId);

    const task = await this.taskRepository.save({
      userId,
      datasetId,
      status: 'queued'
    });

    // 异步执行，让前端可观察 queued -> running -> done/failed 的状态流转
    setTimeout(() => {
      void this.execute(task.id, userId, datasetId);
    }, 30);

    return { taskId: task.id, status: task.status };
  }

  private async execute(
    taskId: number,
    userId: number,
    datasetId: number
  ): Promise<void> {
    try {
      await this.taskRepository.update(taskId, { status: 'running' });

      const records = await this.recordRepository.find({
        where: { datasetId },
        order: { id: 'ASC' }
      });

      const { issues, categoryCounts, issueRecordIds } = runRules(records);
      const score = computeScore(records.length, issueRecordIds.size);

      const report = await this.reportRepository.save({
        userId,
        datasetId,
        taskId,
        score,
        totalRecords: records.length,
        issueRecords: issueRecordIds.size,
        categoryCounts: JSON.stringify(categoryCounts),
        issues: JSON.stringify(issues)
      });

      await this.taskRepository.update(taskId, {
        status: 'done',
        reportId: report.id,
        error: null
      });
    } catch (err) {
      await this.taskRepository.update(taskId, {
        status: 'failed',
        error: err instanceof Error ? err.message : '巡检执行失败'
      });
    }
  }

  /** 查询任务状态（按用户隔离）。 */
  async getTask(userId: number, taskId: number): Promise<InspectionTask> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, userId }
    });
    if (!task) {
      throw new NotFoundException('巡检任务不存在');
    }
    return task;
  }

  /** 获取数据集最新一份报告（按用户+数据集隔离），无则返回 null。 */
  async getLatestReport(
    userId: number,
    datasetId: number
  ): Promise<ReportView | null> {
    await this.assertDatasetOwnership(userId, datasetId);
    const report = await this.reportRepository.findOne({
      where: { userId, datasetId },
      order: { id: 'DESC' }
    });
    return report ? this.toReportView(report) : null;
  }

  /** 分页查询报告问题明细，支持按规则筛选，并附带记录快照。 */
  async getIssues(
    userId: number,
    reportId: number,
    query: QueryIssuesDto
  ): Promise<{
    items: Array<InspectionIssue & { record: RecordEntity | null }>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const report = await this.getReportEntity(userId, reportId);
    const allIssues = JSON.parse(report.issues) as InspectionIssue[];

    const filtered = query.rule
      ? allIssues.filter((issue) => issue.rule === query.rule)
      : allIssues;

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const total = filtered.length;
    const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

    const recordIds = slice.map((issue) => issue.recordId);
    const records = recordIds.length
      ? await this.recordRepository.find({ where: { id: In(recordIds) } })
      : [];
    const recordMap = new Map(records.map((r) => [r.id, r]));

    const items = slice.map((issue) => ({
      ...issue,
      record: recordMap.get(issue.recordId) ?? null
    }));

    return { items, total, page, pageSize };
  }

  /** 缺失字段填默认值。 */
  async fixMissing(
    userId: number,
    reportId: number,
    dto: FixMissingDto
  ): Promise<{ affected: number }> {
    const report = await this.getReportEntity(userId, reportId);
    const targetIds = this.resolveTargetIds(report, 'missing_field', dto.recordIds);
    if (targetIds.length === 0) {
      return { affected: 0 };
    }

    const records = await this.recordRepository.find({
      where: { id: In(targetIds), datasetId: report.datasetId }
    });

    let affected = 0;
    for (const record of records) {
      let changed = false;
      if (this.isBlank(record.category)) {
        record.category = dto.category?.trim() || '未分类';
        changed = true;
      }
      if (this.isBlank(record.region)) {
        record.region = dto.region?.trim() || '未知地区';
        changed = true;
      }
      if (this.isBlank(record.channel)) {
        record.channel = dto.channel?.trim() || '未知渠道';
        changed = true;
      }
      if (this.isBlank(record.date)) {
        record.date =
          dto.date?.trim() || new Date().toISOString().slice(0, 10);
        changed = true;
      }
      if (changed) {
        affected += 1;
      }
    }

    if (affected > 0) {
      await this.recordRepository.save(records);
    }
    return { affected };
  }

  /** 异常金额改为绝对值（0 或超限的仍会在复检中体现，但负值可通过绝对值修复）。 */
  async fixAmount(
    userId: number,
    reportId: number,
    dto: FixAmountDto
  ): Promise<{ affected: number }> {
    const report = await this.getReportEntity(userId, reportId);
    const targetIds = this.resolveTargetIds(
      report,
      'abnormal_amount',
      dto.recordIds
    );
    if (targetIds.length === 0) {
      return { affected: 0 };
    }

    const records = await this.recordRepository.find({
      where: { id: In(targetIds), datasetId: report.datasetId }
    });

    let affected = 0;
    for (const record of records) {
      const abs = Math.abs(record.amount);
      const next = abs > AMOUNT_UPPER_LIMIT ? AMOUNT_UPPER_LIMIT : abs;
      if (next !== record.amount) {
        record.amount = next;
        affected += 1;
      }
    }

    if (affected > 0) {
      await this.recordRepository.save(records);
    }
    return { affected };
  }

  /** 重复记录批量删除。 */
  async fixDelete(
    userId: number,
    reportId: number,
    dto: FixDeleteDto
  ): Promise<{ affected: number }> {
    const report = await this.getReportEntity(userId, reportId);
    if (dto.recordIds.length === 0) {
      throw new BadRequestException('请选择要删除的记录');
    }

    const result = await this.recordRepository.delete({
      id: In(dto.recordIds),
      datasetId: report.datasetId
    });

    return { affected: result.affected ?? 0 };
  }

  private resolveTargetIds(
    report: InspectionReport,
    rule: RuleKey,
    recordIds?: number[]
  ): number[] {
    const issues = JSON.parse(report.issues) as InspectionIssue[];
    const ruleIds = issues
      .filter((issue) => issue.rule === rule)
      .map((issue) => issue.recordId);
    if (recordIds && recordIds.length > 0) {
      const ruleSet = new Set(ruleIds);
      return recordIds.filter((id) => ruleSet.has(id));
    }
    return Array.from(new Set(ruleIds));
  }

  private async getReportEntity(
    userId: number,
    reportId: number
  ): Promise<InspectionReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, userId }
    });
    if (!report) {
      throw new NotFoundException('巡检报告不存在');
    }
    return report;
  }

  private toReportView(report: InspectionReport): ReportView {
    const parsed = JSON.parse(report.categoryCounts) as Partial<
      Record<RuleKey, number>
    >;
    const categoryCounts = RULE_KEYS.reduce(
      (acc, key) => {
        acc[key] = parsed[key] ?? 0;
        return acc;
      },
      {} as Record<RuleKey, number>
    );
    const issues = JSON.parse(report.issues) as InspectionIssue[];
    const issueRecordIds = Array.from(
      new Set(issues.map((issue) => issue.recordId))
    );
    return {
      id: report.id,
      datasetId: report.datasetId,
      taskId: report.taskId,
      score: report.score,
      totalRecords: report.totalRecords,
      issueRecords: report.issueRecords,
      categoryCounts,
      issueRecordIds,
      createdAt: report.createdAt
    };
  }

  private isBlank(value: unknown): boolean {
    return value === null || value === undefined || String(value).trim() === '';
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
