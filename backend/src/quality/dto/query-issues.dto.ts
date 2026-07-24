import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import type { QualityRule } from '../quality-issue.entity';

const RULE_VALUES: QualityRule[] = [
  'missing_field',
  'abnormal_amount',
  'future_date',
  'duplicate_key'
];

export class QueryIssuesDto {
  @IsOptional()
  @IsString()
  @IsIn(RULE_VALUES)
  rule?: QualityRule;

  @IsOptional()
  @IsString()
  @IsIn(['open', 'fixed'])
  status?: 'open' | 'fixed';

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 20;
}
