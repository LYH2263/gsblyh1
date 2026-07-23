import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';

@Controller('datasets/:id/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  summary(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number,
    @Query() query: QueryAnalyticsDto
  ) {
    return this.analyticsService.summary(user.userId, datasetId, query);
  }

  @Get('trend')
  trend(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number,
    @Query() query: QueryAnalyticsDto
  ) {
    return this.analyticsService.trend(user.userId, datasetId, query);
  }

  @Get('top')
  top(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number,
    @Query() query: QueryAnalyticsDto
  ) {
    return this.analyticsService.top(user.userId, datasetId, query);
  }

  @Get('pie')
  pie(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) datasetId: number,
    @Query() query: QueryAnalyticsDto
  ) {
    return this.analyticsService.pie(user.userId, datasetId, query);
  }
}
