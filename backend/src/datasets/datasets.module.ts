import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dataset } from './dataset.entity';
import { DatasetsService } from './datasets.service';
import { DatasetsController } from './datasets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Dataset])],
  providers: [DatasetsService],
  controllers: [DatasetsController]
})
export class DatasetsModule {}
