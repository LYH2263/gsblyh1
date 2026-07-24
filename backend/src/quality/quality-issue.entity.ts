import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { QualityReport } from './quality-report.entity';

export type QualityRule =
  | 'missing_field'
  | 'abnormal_amount'
  | 'future_date'
  | 'duplicate_key';

export type QualityIssueStatus = 'open' | 'fixed';

@Entity('quality_issues')
@Index('idx_quality_issue_report', ['reportId'])
@Index('idx_quality_issue_record', ['datasetId', 'recordId'])
export class QualityIssue {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'report_id' })
  reportId!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'dataset_id' })
  datasetId!: number;

  @Column({ name: 'record_id' })
  recordId!: number;

  @Column({ type: 'text' })
  rule!: QualityRule;

  @Column({ type: 'text', nullable: true })
  field?: string | null;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ type: 'text', default: 'open' })
  status!: QualityIssueStatus;

  @Column({ type: 'text', nullable: true })
  detail?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'fixed_at', type: 'datetime', nullable: true })
  fixedAt?: Date | null;

  @ManyToOne(() => QualityReport, (report) => report.issues, { onDelete: 'CASCADE' })
  report!: QualityReport;
}
