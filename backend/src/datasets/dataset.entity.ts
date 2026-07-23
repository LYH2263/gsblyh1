import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm';
import { User } from '../users/user.entity';
import { RecordEntity } from '../records/record.entity';

@Entity('datasets')
export class Dataset {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.datasets, {
    onDelete: 'CASCADE'
  })
  user!: User;

  @OneToMany(() => RecordEntity, (record) => record.dataset)
  records!: RecordEntity[];
}
