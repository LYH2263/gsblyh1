import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityService } from './quality.service';
import { QualityController } from './quality.controller';
import { InspectionTask } from './inspection-task.entity';
import { InspectionReport } from './inspection-report.entity';
import { RecordEntity } from '../records/record.entity';
import { Dataset } from '../datasets/dataset.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InspectionTask, InspectionReport, RecordEntity, Dataset])
  ],
  providers: [QualityService],
  controllers: [QualityController]
})
export class QualityModule {}
