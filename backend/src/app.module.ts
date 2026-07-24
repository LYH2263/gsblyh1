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
import { QualityTask } from './quality/quality-task.entity';
import { QualityReport } from './quality/quality-report.entity';
import { QualityIssue } from './quality/quality-issue.entity';
import { AppController } from './app.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH ?? 'data/insightboard.db',
      entities: [User, Dataset, RecordEntity, QualityTask, QualityReport, QualityIssue],
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
