import { ArrayMinSize, IsArray, IsInt, Min } from 'class-validator';

export class RepairDuplicatesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  issueIds!: number[];
}
