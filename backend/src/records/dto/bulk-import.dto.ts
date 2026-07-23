import { IsNotEmpty, IsString } from 'class-validator';

export class BulkImportDto {
  @IsString()
  @IsNotEmpty()
  csvText!: string;
}
