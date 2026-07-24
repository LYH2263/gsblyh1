import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { User } from '../users/user.entity';
import { Dataset } from '../datasets/dataset.entity';

export type TaskStatus = 'queued' | 'running' | 'done' | 'failed';

@Entity('inspection_tasks')
@Index('idx_task_user_dataset', ['userId', 'datasetId'])
export class InspectionTask {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'dataset_id' })
  datasetId!: number;

  @Column({ type: 'text', default: 'queued' })
  status!: TaskStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'report_id', nullable: true })
  reportId?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Dataset, { onDelete: 'CASCADE' })
  dataset!: Dataset;
}
