import { IsInt, IsOptional, IsString, Min, Max, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryIssuesDto {
  @IsOptional()
  @IsString()
  @IsIn(['missing', 'abnormal_amount', 'future_date', 'duplicate', ''])
  rule?: string;

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
