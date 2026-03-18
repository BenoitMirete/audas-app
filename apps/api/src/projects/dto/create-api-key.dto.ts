import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateApiKeyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;
}
