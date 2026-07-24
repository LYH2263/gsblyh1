import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { Dataset } from '../datasets/dataset.entity';

export type QualityTaskStatus = 'queued' | 'running' | 'done' | 'failed';

@Entity('quality_tasks')
@Index('idx_quality_task_dataset', ['userId', 'datasetId'])
export class QualityTask {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'dataset_id' })
  datasetId!: number;

  @Column({ type: 'text', default: 'queued' })
  status!: QualityTaskStatus;

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @Column({ name: 'report_id', type: 'integer', nullable: true })
  reportId?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt?: Date | null;

  @ManyToOne(() => Dataset, { onDelete: 'CASCADE' })
  dataset!: Dataset;
}
