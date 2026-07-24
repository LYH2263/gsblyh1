import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { DatasetsModule } from './datasets/datasets.module';
import { RecordsModule } from './records/records.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { QualityModule } from './quality/quality.module';
import { User } from './users/user.entity';
import { Dataset } from './datasets/dataset.entity';
import { RecordEntity } from './records/record.entity';
import { InspectionTask } from './quality/inspection-task.entity';
import { InspectionReport } from './quality/inspection-report.entity';
import { AppController } from './app.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH ?? 'data/insightboard.db',
      entities: [User, Dataset, RecordEntity, InspectionTask, InspectionReport],
      synchronize: true
    }),
    AuthModule,
    DatasetsModule,
    RecordsModule,
    AnalyticsModule,
    QualityModule
  ],
  controllers: [AppController]
})
export class AppModule {}
