import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { RecordsService } from './records.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { CreateRecordDto } from './dto/create-record.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { QueryRecordsDto } from './dto/query-records.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Get('datasets/:id/records')
  list(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number,
    @Query() query: QueryRecordsDto
  ) {
    return this.recordsService.listByDataset(user.userId, datasetId, query);
  }

  @Post('datasets/:id/records')
  create(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number,
    @Body() dto: CreateRecordDto
  ) {
    return this.recordsService.create(user.userId, datasetId, dto);
  }

  @Post('datasets/:id/records/bulk')
  bulkImport(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number,
    @Body() dto: BulkImportDto
  ) {
    return this.recordsService.bulkImport(user.userId, datasetId, dto);
  }

  @Delete('records/:recordId')
  remove(
    @CurrentUser() user: JwtUser,
    @Param('recordId', ParseIntPipe) recordId: number
  ) {
    return this.recordsService.remove(user.userId, recordId);
  }
}
