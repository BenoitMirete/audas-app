import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { TestStatus } from '@audas/shared';
import { CreateTestResultDto } from '@audas/shared';

export class CreateTestResultRequestDto implements CreateTestResultDto {
  @ApiProperty() @IsString() runId!: string;
  @ApiProperty() @IsString() projectId!: string;
  @ApiProperty() @IsString() title!: string;
  @ApiProperty({ enum: TestStatus }) @IsEnum(TestStatus) status!: TestStatus;
  @ApiProperty() @IsNumber() @Type(() => Number) duration!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() errorMessage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stackTrace?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}
