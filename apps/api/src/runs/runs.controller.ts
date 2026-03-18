import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RunsService } from './runs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CreateRunRequestDto } from './dto/create-run.dto';
import { UpdateRunStatusDto } from './dto/update-run-status.dto';
import { RunQueryDto } from './dto/run-query.dto';

@ApiTags('runs')
@Controller('runs')
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  // Reporter creates runs using API key
  @UseGuards(ApiKeyGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new run (reporter, uses API key)' })
  create(@Body() dto: CreateRunRequestDto) {
    return this.runsService.create(dto);
  }

  // Reporter updates run status using API key
  @UseGuards(ApiKeyGuard)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update run status (reporter, uses API key)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRunStatusDto,
  ) {
    return this.runsService.updateStatus(id, dto.status, dto.duration);
  }

  // Dashboard reads use JWT
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('project/:projectId')
  @ApiOperation({ summary: 'List runs for a project' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'branch', required: false })
  @ApiQuery({ name: 'tag', required: false })
  findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: RunQueryDto,
  ) {
    return this.runsService.findAll(projectId, query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get run detail with test results' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.runsService.findOne(id);
  }
}
