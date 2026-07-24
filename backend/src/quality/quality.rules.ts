import type { QualityRule } from './quality-issue.entity';
import type { RecordEntity } from '../records/record.entity';

export interface DetectedIssue {
  recordId: number;
  rule: QualityRule;
  field?: string | null;
  summary: string;
  detail?: string | null;
}

export const MISSING_DEFAULTS: Record<string, string> = {
  category: '未分类',
  region: '未知地区',
  channel: '未知渠道'
};

const MISSING_FIELDS = ['date', 'category', 'region', 'channel'] as const;

const ABNORMAL_AMOUNT_MAX = 1e7;

const isBlank = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  return typeof value === 'string' && value.trim() === '';
};

const todayString = (now: Date): string => {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDateOnly = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return null;
  }
  return new Date(y, m - 1, d);
};

export function inspectRecords(
  records: RecordEntity[],
  now: Date = new Date()
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const today = todayString(now);
  const todayDate = parseDateOnly(today) as Date;

  const duplicateGroups = new Map<string, RecordEntity[]>();

  for (const record of records) {
    for (const field of MISSING_FIELDS) {
      if (isBlank(record[field])) {
        issues.push({
          recordId: record.id,
          rule: 'missing_field',
          field,
          summary: `字段 "${field}" 为空`
        });
      }
    }

    if (typeof record.amount !== 'number' || !Number.isFinite(record.amount)) {
      issues.push({
        recordId: record.id,
        rule: 'abnormal_amount',
        field: 'amount',
        summary: `金额 ${String(record.amount)} 不是有效数字`
      });
    } else if (record.amount <= 0) {
      issues.push({
        recordId: record.id,
        rule: 'abnormal_amount',
        field: 'amount',
        summary: `金额 ${record.amount} 异常（≤0）`
      });
    } else if (record.amount > ABNORMAL_AMOUNT_MAX) {
      issues.push({
        recordId: record.id,
        rule: 'abnormal_amount',
        field: 'amount',
        summary: `金额 ${record.amount} 异常（>${ABNORMAL_AMOUNT_MAX}）`
      });
    }

    if (!isBlank(record.date)) {
      const parsed = parseDateOnly(record.date);
      if (!parsed) {
        issues.push({
          recordId: record.id,
          rule: 'future_date',
          field: 'date',
          summary: `日期 "${record.date}" 格式无法解析`
        });
      } else if (parsed.getTime() > todayDate.getTime()) {
        issues.push({
          recordId: record.id,
          rule: 'future_date',
          field: 'date',
          summary: `日期 ${record.date} 晚于今日 ${today}`
        });
      }
    }

    const key = `${record.date}||${record.category}||${record.region}||${record.channel}`;
    const group = duplicateGroups.get(key);
    if (group) {
      group.push(record);
    } else {
      duplicateGroups.set(key, [record]);
    }
  }

  for (const group of duplicateGroups.values()) {
    if (group.length <= 1) {
      continue;
    }
    const sorted = [...group].sort((a, b) => a.id - b.id);
    const earliest = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const dup = sorted[i];
      issues.push({
        recordId: dup.id,
        rule: 'duplicate_key',
        field: null,
        summary: `与记录 #${earliest.id} 重复（date=${dup.date}, category=${dup.category}, region=${dup.region}, channel=${dup.channel}）`,
        detail: JSON.stringify({ duplicateOf: earliest.id })
      });
    }
  }

  return issues;
}

export function computeScore(totalRecords: number, issueRecords: Set<number>): number {
  if (totalRecords <= 0) {
    return 0;
  }
  const clean = totalRecords - issueRecords.size;
  const score = Math.round((clean / totalRecords) * 100);
  return Math.max(0, Math.min(100, score));
}

export function defaultDateValue(now: Date = new Date()): string {
  return todayString(now);
}
