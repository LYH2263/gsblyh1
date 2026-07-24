import { IsIn, IsOptional, IsString } from 'class-validator';

export const REPAIR_ACTIONS = ['fill_default', 'amount_abs'] as const;
export type RepairAction = (typeof REPAIR_ACTIONS)[number];

export class RepairIssueDto {
  @IsString()
  @IsIn(REPAIR_ACTIONS)
  action!: RepairAction;

  @IsOptional()
  @IsString()
  defaultValue?: string;
}
