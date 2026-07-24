import { RecordEntity } from '../records/record.entity';
import {
  InspectionIssue,
  RuleKey
} from './inspection-report.entity';

export const RULE_KEYS: RuleKey[] = [
  'missing_field',
  'abnormal_amount',
  'future_date',
  'duplicate_key'
];

export const AMOUNT_UPPER_LIMIT = 1e7;

/** 组合键：date + category + region + channel */
const buildComboKey = (record: RecordEntity): string =>
  [record.date, record.category, record.region, record.channel].join('|');

const isBlank = (value: unknown): boolean =>
  value === null || value === undefined || String(value).trim() === '';

/** 是否为未来日期（严格晚于今天，按本地日期比较） */
const isFutureDate = (date: string, today: string): boolean => {
  if (isBlank(date)) {
    return false;
  }
  return date > today;
};

export interface RuleResult {
  issues: InspectionIssue[];
  categoryCounts: Record<RuleKey, number>;
  issueRecordIds: Set<number>;
}

/**
 * 对一批记录执行四类规则巡检。
 * - missing_field: category/region/channel/date 任一为空
 * - abnormal_amount: amount <= 0 或 > 1e7
 * - future_date: date 晚于今天
 * - duplicate_key: 同数据集 date+category+region+channel 相同，除最早一条（id 最小）外标记重复
 */
export function runRules(
  records: RecordEntity[],
  today: string = new Date().toISOString().slice(0, 10)
): RuleResult {
  const issues: InspectionIssue[] = [];
  const categoryCounts: Record<RuleKey, number> = {
    missing_field: 0,
    abnormal_amount: 0,
    future_date: 0,
    duplicate_key: 0
  };
  const issueRecordIds = new Set<number>();

  const pushIssue = (recordId: number, rule: RuleKey, summary: string) => {
    issues.push({ recordId, rule, summary });
    categoryCounts[rule] += 1;
    issueRecordIds.add(recordId);
  };

  // 预计算重复组合键：按 comboKey 分组，保留最早一条（id 最小），其余标重复
  const groups = new Map<string, RecordEntity[]>();
  for (const record of records) {
    const key = buildComboKey(record);
    const list = groups.get(key);
    if (list) {
      list.push(record);
    } else {
      groups.set(key, [record]);
    }
  }
  const duplicateIds = new Set<number>();
  for (const list of groups.values()) {
    if (list.length <= 1) {
      continue;
    }
    const sorted = [...list].sort((a, b) => a.id - b.id);
    sorted.slice(1).forEach((record) => duplicateIds.add(record.id));
  }

  for (const record of records) {
    // 字段缺失
    const missingFields: string[] = [];
    if (isBlank(record.date)) missingFields.push('date');
    if (isBlank(record.category)) missingFields.push('category');
    if (isBlank(record.region)) missingFields.push('region');
    if (isBlank(record.channel)) missingFields.push('channel');
    if (missingFields.length > 0) {
      pushIssue(
        record.id,
        'missing_field',
        `字段缺失：${missingFields.join('、')}`
      );
    }

    // 异常金额
    if (
      typeof record.amount !== 'number' ||
      !Number.isFinite(record.amount) ||
      record.amount <= 0 ||
      record.amount > AMOUNT_UPPER_LIMIT
    ) {
      pushIssue(
        record.id,
        'abnormal_amount',
        `异常金额：${record.amount}（应为 0 < amount ≤ ${AMOUNT_UPPER_LIMIT}）`
      );
    }

    // 未来日期
    if (isFutureDate(record.date, today)) {
      pushIssue(record.id, 'future_date', `未来日期：${record.date}（今天 ${today}）`);
    }

    // 重复组合键
    if (duplicateIds.has(record.id)) {
      pushIssue(
        record.id,
        'duplicate_key',
        `重复组合键：${record.date}/${record.category}/${record.region}/${record.channel}`
      );
    }
  }

  return { issues, categoryCounts, issueRecordIds };
}

/**
 * 质量分 = 无问题记录占比 * 100，四舍五入取整，范围 0-100。
 * 无记录时视为满分 100。
 */
export function computeScore(
  totalRecords: number,
  issueRecords: number
): number {
  if (totalRecords <= 0) {
    return 100;
  }
  const healthy = Math.max(0, totalRecords - issueRecords);
  const score = Math.round((healthy / totalRecords) * 100);
  return Math.min(100, Math.max(0, score));
}
