import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dataset } from './dataset.entity';
import { CreateDatasetDto } from './dto/create-dataset.dto';

@Injectable()
export class DatasetsService {
  constructor(
    @InjectRepository(Dataset)
    private readonly datasetRepository: Repository<Dataset>
  ) {}

  async listByUser(userId: number): Promise<Dataset[]> {
    return this.datasetRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  async create(userId: number, dto: CreateDatasetDto): Promise<Dataset> {
    return this.datasetRepository.save({
      userId,
      name: dto.name,
      description: dto.description
    });
  }

  async remove(userId: number, datasetId: number): Promise<{ id: number }> {
    const dataset = await this.datasetRepository.findOne({
      where: { id: datasetId, userId }
    });

    if (!dataset) {
      throw new NotFoundException('数据集不存在');
    }

    await this.datasetRepository.remove(dataset);
    return { id: datasetId };
  }
}
