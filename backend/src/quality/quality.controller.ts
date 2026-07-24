import {
  BadRequestException,
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
import { RepairIssueDto } from './dto/repair-issue.dto';
import { RepairDuplicatesDto } from './dto/repair-duplicates.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Post('datasets/:id/quality/tasks')
  enqueue(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number
  ) {
    return this.qualityService.enqueueInspection(user.userId, datasetId);
  }

  @Get('quality/tasks/:taskId')
  task(
    @CurrentUser() user: JwtUser,
    @Param('taskId', ParseIntPipe) taskId: number
  ) {
    return this.qualityService.getTask(user.userId, taskId);
  }

  @Get('datasets/:id/quality/reports/latest')
  latest(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number
  ) {
    return this.qualityService.getLatestReport(user.userId, datasetId);
  }

  @Get('datasets/:id/quality/warnings')
  warnings(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number
  ) {
    return this.qualityService.getWarnings(user.userId, datasetId);
  }

  @Get('quality/reports/:reportId')
  report(
    @CurrentUser() user: JwtUser,
    @Param('reportId', ParseIntPipe) reportId: number
  ) {
    return this.qualityService.getReport(user.userId, reportId);
  }

  @Get('quality/reports/:reportId/issues')
  issues(
    @CurrentUser() user: JwtUser,
    @Param('reportId', ParseIntPipe) reportId: number,
    @Query() query: QueryIssuesDto
  ) {
    return this.qualityService.listIssues(user.userId, reportId, query);
  }

  @Post('quality/issues/:issueId/repair')
  repair(
    @CurrentUser() user: JwtUser,
    @Param('issueId', ParseIntPipe) issueId: number,
    @Body() dto: RepairIssueDto
  ) {
    return this.qualityService.repairIssue(user.userId, issueId, dto);
  }

  @Post('quality/reports/:reportId/repair-duplicates')
  repairDuplicates(
    @CurrentUser() user: JwtUser,
    @Param('reportId', ParseIntPipe) reportId: number,
    @Body() dto: RepairDuplicatesDto
  ) {
    return this.qualityService.repairDuplicates(user.userId, reportId, dto);
  }

  @Post('quality/reports/:reportId/repair-batch/:rule')
  repairBatch(
    @CurrentUser() user: JwtUser,
    @Param('reportId', ParseIntPipe) reportId: number,
    @Param('rule') rule: string
  ) {
    if (rule !== 'missing_field' && rule !== 'abnormal_amount') {
      throw new BadRequestException(`不支持批量修复的规则: ${rule}`);
    }
    return this.qualityService.repairBatch(user.userId, reportId, rule);
  }
}
