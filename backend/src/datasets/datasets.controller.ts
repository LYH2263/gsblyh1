import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards
} from '@nestjs/common';
import { DatasetsService } from './datasets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { CreateDatasetDto } from './dto/create-dataset.dto';

@Controller('datasets')
@UseGuards(JwtAuthGuard)
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.datasetsService.listByUser(user.userId);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateDatasetDto) {
    return this.datasetsService.create(user.userId, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.datasetsService.remove(user.userId, id);
  }
}
