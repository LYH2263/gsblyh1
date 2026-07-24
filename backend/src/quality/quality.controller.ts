import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { QualityService } from './quality.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { QueryIssuesDto } from './dto/query-issues.dto';

@Controller('quality')
@UseGuards(JwtAuthGuard)
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Post('datasets/:id/inspections')
  startInspection(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number
  ) {
    return this.qualityService.startInspection(user.userId, datasetId);
  }

  @Get('inspections/:taskId')
  getTask(
    @CurrentUser() user: JwtUser,
    @Param('taskId', ParseIntPipe) taskId: number
  ) {
    return this.qualityService.getTask(user.userId, taskId);
  }

  @Get('inspections/:taskId/report')
  getReport(
    @CurrentUser() user: JwtUser,
    @Param('taskId', ParseIntPipe) taskId: number
  ) {
    return this.qualityService.getReport(user.userId, taskId);
  }

  @Get('inspections/:taskId/issues')
  getIssues(
    @CurrentUser() user: JwtUser,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Query() query: QueryIssuesDto
  ) {
    return this.qualityService.getReportIssues(user.userId, taskId, {
      rule: query.rule || undefined,
      page: query.page,
      pageSize: query.pageSize
    });
  }

  @Get('datasets/:id/reports/latest')
  getLatestReport(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number
  ) {
    return this.qualityService.getLatestReport(user.userId, datasetId);
  }

  @Get('datasets/:id/flagged-records')
  getFlaggedRecords(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number
  ) {
    return this.qualityService.getFlaggedRecordIds(user.userId, datasetId);
  }

  @Post('datasets/:id/fix/missing')
  fixMissing(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number,
    @Body() body: { recordIds: number[] }
  ) {
    return this.qualityService.fixMissing(user.userId, datasetId, body.recordIds);
  }

  @Post('datasets/:id/fix/amounts')
  fixAmounts(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number,
    @Body() body: { recordIds: number[] }
  ) {
    return this.qualityService.fixAbnormalAmounts(user.userId, datasetId, body.recordIds);
  }

  @Post('datasets/:id/fix/duplicates')
  fixDuplicates(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number,
    @Body() body: { recordIds: number[] }
  ) {
    return this.qualityService.fixDuplicates(user.userId, datasetId, body.recordIds);
  }
}
