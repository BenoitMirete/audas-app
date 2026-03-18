import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CIMetadataDto {
  @ApiPropertyOptional() @IsOptional() @IsString() branch?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() commitSha?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() commitMessage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pipelineId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pipelineUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mrId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mrUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() triggeredBy?: string;
}
