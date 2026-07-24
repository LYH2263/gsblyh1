import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';

export type InspectionStatus = 'queued' | 'running' | 'done' | 'failed';

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
  status!: InspectionStatus;

  @Column({ name: 'report_id', type: 'integer', nullable: true })
  reportId?: number | null;

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
