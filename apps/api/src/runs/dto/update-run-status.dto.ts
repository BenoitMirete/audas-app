import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { RunStatus } from '@audas/shared';

export class UpdateRunStatusDto {
  @ApiProperty({ enum: RunStatus })
  @IsEnum(RunStatus)
  status!: RunStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  duration?: number;
}
