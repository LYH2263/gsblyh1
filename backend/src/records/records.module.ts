import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';
import { RecordEntity } from './record.entity';
import { Dataset } from '../datasets/dataset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RecordEntity, Dataset])],
  providers: [RecordsService],
  controllers: [RecordsController]
})
export class RecordsModule {}
