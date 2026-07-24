import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { RULE_KEYS } from '../rules.engine';
import type { RuleKey } from '../inspection-report.entity';

export class QueryIssuesDto {
  @IsOptional()
  @IsIn(RULE_KEYS)
  rule?: RuleKey;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;
}
