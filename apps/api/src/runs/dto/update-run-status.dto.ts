import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { RunStatus } from '@audas/shared';

export class UpdateRunStatusDto {
  @ApiProperty({ enum: [RunStatus.RUNNING, RunStatus.PASSED, RunStatus.FAILED] })
  @IsIn([RunStatus.RUNNING, RunStatus.PASSED, RunStatus.FAILED])
  status!: RunStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  duration?: number;
}
