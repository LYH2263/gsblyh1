import type { RuleKey } from '@/types/models';

export interface RuleMeta {
  key: RuleKey;
  label: string;
  description: string;
  tagType: 'danger' | 'warning' | 'info' | 'primary';
}

export const RULE_METAS: RuleMeta[] = [
  {
    key: 'missing_field',
    label: '字段缺失',
    description: 'category / region / channel / date 任一为空',
    tagType: 'warning'
  },
  {
    key: 'abnormal_amount',
    label: '异常金额',
    description: 'amount ≤ 0 或 > 1e7',
    tagType: 'danger'
  },
  {
    key: 'future_date',
    label: '未来日期',
    description: 'date 晚于今天',
    tagType: 'primary'
  },
  {
    key: 'duplicate_key',
    label: '重复组合键',
    description: '同数据集 date+category+region+channel 相同，除最早一条外均标重复',
    tagType: 'info'
  }
];

export const RULE_META_MAP: Record<RuleKey, RuleMeta> = RULE_METAS.reduce(
  (acc, meta) => {
    acc[meta.key] = meta;
    return acc;
  },
  {} as Record<RuleKey, RuleMeta>
);
