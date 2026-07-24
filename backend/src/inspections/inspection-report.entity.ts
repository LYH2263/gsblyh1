import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn
} from 'typeorm';

export type RuleKey =
  | 'missing_field'
  | 'abnormal_amount'
  | 'future_date'
  | 'duplicate_key';

export interface InspectionIssue {
  recordId: number;
  rule: RuleKey;
  summary: string;
}

@Entity('inspection_reports')
@Index('idx_report_user_dataset', ['userId', 'datasetId'])
export class InspectionReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'dataset_id' })
  datasetId!: number;

  @Column({ name: 'task_id' })
  taskId!: number;

  /** 质量分 0-100（列名沿用已有库 quality_score，避免 synchronize 重建失败） */
  @Column({ name: 'quality_score', type: 'integer', default: 0 })
  score!: number;

  /** 巡检时的记录总数 */
  @Column({ name: 'total_records', type: 'integer', default: 0 })
  totalRecords!: number;

  /** 存在问题的记录数（去重） */
  @Column({ name: 'issue_records', type: 'integer', default: 0 })
  issueRecords!: number;

  /** 按规则的分类计数，JSON: { missing_field: n, ... } */
  @Column({ name: 'issue_counts', type: 'text', default: '{}' })
  categoryCounts!: string;

  /** 明细，JSON: InspectionIssue[] */
  @Column({ type: 'text' })
  issues!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
