import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString
} from 'class-validator';

export class FixMissingDto {
  /** 需要修复的记录 id 列表；为空则修复最新报告中所有 missing_field 记录 */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  recordIds?: number[];

  /** 缺失字段填充的默认值 */
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  date?: string;
}

export class FixAmountDto {
  /** 需要修复的记录 id 列表；为空则修复最新报告中所有 abnormal_amount 记录 */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  recordIds?: number[];
}

export class FixDeleteDto {
  /** 需要批量删除的记录 id 列表 */
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  recordIds!: number[];
}
