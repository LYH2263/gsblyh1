import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';
import { InspectionTask } from './inspection-task.entity';
import { InspectionReport } from './inspection-report.entity';
import { RecordEntity } from '../records/record.entity';
import { Dataset } from '../datasets/dataset.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InspectionTask,
      InspectionReport,
      RecordEntity,
      Dataset
    ])
  ],
  providers: [InspectionsService],
  controllers: [InspectionsController]
})
export class InspectionsModule {}
