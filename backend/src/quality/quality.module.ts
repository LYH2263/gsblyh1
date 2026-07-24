import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';
import { QualityTask } from './quality-task.entity';
import { QualityReport } from './quality-report.entity';
import { QualityIssue } from './quality-issue.entity';
import { Dataset } from '../datasets/dataset.entity';
import { RecordEntity } from '../records/record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QualityTask,
      QualityReport,
      QualityIssue,
      Dataset,
      RecordEntity
    ])
  ],
  providers: [QualityService],
  controllers: [QualityController]
})
export class QualityModule {}
