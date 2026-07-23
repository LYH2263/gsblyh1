import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { RecordEntity } from '../records/record.entity';
import { Dataset } from '../datasets/dataset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RecordEntity, Dataset])],
  providers: [AnalyticsService],
  controllers: [AnalyticsController]
})
export class AnalyticsModule {}
