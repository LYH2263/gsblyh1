import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm';
import { Dataset } from '../datasets/dataset.entity';
import { QualityIssue } from './quality-issue.entity';

@Entity('quality_reports')
@Index('idx_quality_report_dataset', ['userId', 'datasetId'])
export class QualityReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'dataset_id' })
  datasetId!: number;

  @Column({ name: 'task_id' })
  taskId!: number;

  @Column({ type: 'int' })
  score!: number;

  @Column({ name: 'total_records', type: 'int' })
  totalRecords!: number;

  @Column({ name: 'count_missing', type: 'int', default: 0 })
  countMissing!: number;

  @Column({ name: 'count_abnormal_amount', type: 'int', default: 0 })
  countAbnormalAmount!: number;

  @Column({ name: 'count_future_date', type: 'int', default: 0 })
  countFutureDate!: number;

  @Column({ name: 'count_duplicate', type: 'int', default: 0 })
  countDuplicate!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Dataset, { onDelete: 'CASCADE' })
  dataset!: Dataset;

  @OneToMany(() => QualityIssue, (issue) => issue.report)
  issues!: QualityIssue[];
}
