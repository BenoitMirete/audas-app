import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRunDto } from '@audas/shared';
import { CIMetadataDto } from './ci-metadata.dto';

export class CreateRunRequestDto implements CreateRunDto {
  @ApiProperty()
  @IsString()
  projectId!: string;

  @ApiPropertyOptional({ type: CIMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CIMetadataDto)
  ci?: CIMetadataDto;
}
