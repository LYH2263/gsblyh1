import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { Dataset } from '../datasets/dataset.entity';

@Entity('records')
@Index('idx_dataset_date', ['datasetId', 'date'])
export class RecordEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'dataset_id' })
  datasetId!: number;

  @Column({ type: 'text' })
  date!: string;

  @Column({ type: 'text' })
  category!: string;

  @Column({ type: 'text' })
  region!: string;

  @Column({ type: 'text' })
  channel!: string;

  @Column({ type: 'float' })
  amount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Dataset, (dataset) => dataset.records, {
    onDelete: 'CASCADE'
  })
  dataset!: Dataset;
}
