import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { CreateRunDto } from '@audas/shared';

export class CreateRunRequestDto implements CreateRunDto {
  @ApiProperty()
  @IsString()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  ci?: Record<string, string>;
}
