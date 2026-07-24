import type { QualityRule } from '@/types/models';

export interface RuleMeta {
  key: QualityRule;
  label: string;
  short: string;
  color: string;
  bgColor: string;
  description: string;
  repairHint: string;
}

export const RULE_META: Record<QualityRule, RuleMeta> = {
  missing_field: {
    key: 'missing_field',
    label: '字段缺失',
    short: '缺失',
    color: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.12)',
    description: 'category / region / channel / date 字段为空',
    repairHint: '可填充默认值'
  },
  abnormal_amount: {
    key: 'abnormal_amount',
    label: '异常金额',
    short: '异常金额',
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.12)',
    description: '金额 ≤ 0 或 > 10,000,000',
    repairHint: '可取绝对值修复负值'
  },
  future_date: {
    key: 'future_date',
    label: '未来日期',
    short: '未来日期',
    color: '#7c3aed',
    bgColor: 'rgba(124, 58, 237, 0.12)',
    description: '日期晚于今日（需手动修正）',
    repairHint: '需手动修正，不支持自动修复'
  },
  duplicate_key: {
    key: 'duplicate_key',
    label: '重复组合键',
    short: '重复',
    color: '#0891b2',
    bgColor: 'rgba(8, 145, 178, 0.12)',
    description: '同数据集 date+category+region+channel 相同，除最早一条外',
    repairHint: '可批量删除重复记录'
  }
};

export const RULE_ORDER: QualityRule[] = [
  'missing_field',
  'abnormal_amount',
  'future_date',
  'duplicate_key'
];

export const scoreLevel = (score: number): { label: string; color: string } => {
  if (score >= 90) {
    return { label: '优秀', color: '#16a34a' };
  }
  if (score >= 70) {
    return { label: '良好', color: '#2563eb' };
  }
  if (score >= 50) {
    return { label: '一般', color: '#d97706' };
  }
  return { label: '较差', color: '#dc2626' };
};
