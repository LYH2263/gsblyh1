import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BulkImportDto {
  @IsString()
  @IsNotEmpty()
  csvText!: string;

  /**
   * 宽松模式：允许含质量问题的数据（空字段/负金额/未来日期）入库，
   * 便于随后用巡检工作台发现并修复。默认 false，保持严格校验。
   */
  @IsOptional()
  @IsBoolean()
  lenient?: boolean;
}
