import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { User } from '../users/user.entity';
import { Dataset } from '../datasets/dataset.entity';

export type IssueRule = 'missing' | 'abnormal_amount' | 'future_date' | 'duplicate';

export interface QualityIssue {
  recordId: number;
  rule: IssueRule;
  summary: string;
  field?: string;
}

export interface IssueCounts {
  missing: number;
  abnormalAmount: number;
  futureDate: number;
  duplicate: number;
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

  @Column({ name: 'quality_score', type: 'int' })
  qualityScore!: number;

  @Column({ name: 'total_records', type: 'int' })
  totalRecords!: number;

  @Column({ name: 'issue_counts', type: 'simple-json' })
  issueCounts!: IssueCounts;

  @Column({ type: 'simple-json' })
  issues!: QualityIssue[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Dataset, { onDelete: 'CASCADE' })
  dataset!: Dataset;
}
