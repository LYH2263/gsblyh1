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
import { InspectionsService } from './inspections.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { QueryIssuesDto } from './dto/query-issues.dto';
import { FixAmountDto, FixDeleteDto, FixMissingDto } from './dto/fix.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  /** 发起巡检 / 复检 */
  @Post('datasets/:id/inspections')
  submit(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number
  ) {
    return this.inspectionsService.submit(user.userId, datasetId);
  }

  /** 查询任务状态 */
  @Get('inspections/tasks/:taskId')
  getTask(
    @CurrentUser() user: JwtUser,
    @Param('taskId', ParseIntPipe) taskId: number
  ) {
    return this.inspectionsService.getTask(user.userId, taskId);
  }

  /** 数据集最新报告 */
  @Get('datasets/:id/inspections/latest')
  getLatest(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number
  ) {
    return this.inspectionsService.getLatestReport(user.userId, datasetId);
  }

  /** 报告问题明细（按规则筛选 + 分页） */
  @Get('inspections/reports/:reportId/issues')
  getIssues(
    @CurrentUser() user: JwtUser,
    @Param('reportId', ParseIntPipe) reportId: number,
    @Query() query: QueryIssuesDto
  ) {
    return this.inspectionsService.getIssues(user.userId, reportId, query);
  }

  /** 修复：缺失字段填默认值 */
  @Post('inspections/reports/:reportId/fix/missing')
  fixMissing(
    @CurrentUser() user: JwtUser,
    @Param('reportId', ParseIntPipe) reportId: number,
    @Body() dto: FixMissingDto
  ) {
    return this.inspectionsService.fixMissing(user.userId, reportId, dto);
  }

  /** 修复：异常金额改绝对值 */
  @Post('inspections/reports/:reportId/fix/amount')
  fixAmount(
    @CurrentUser() user: JwtUser,
    @Param('reportId', ParseIntPipe) reportId: number,
    @Body() dto: FixAmountDto
  ) {
    return this.inspectionsService.fixAmount(user.userId, reportId, dto);
  }

  /** 修复：重复记录批量删除 */
  @Post('inspections/reports/:reportId/fix/delete')
  fixDelete(
    @CurrentUser() user: JwtUser,
    @Param('reportId', ParseIntPipe) reportId: number,
    @Body() dto: FixDeleteDto
  ) {
    return this.inspectionsService.fixDelete(user.userId, reportId, dto);
  }
}
