import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { TestResultsService } from './test-results.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CreateTestResultRequestDto } from './dto/create-test-result.dto';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? './uploads';

const multerStorage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${extname(file.originalname)}`);
  },
});

@ApiTags('test-results')
@Controller('test-results')
export class TestResultsController {
  constructor(private readonly testResultsService: TestResultsService) {}

  @UseGuards(ApiKeyGuard)
  @Post()
  @ApiOperation({ summary: 'Create test result (reporter, API key)' })
  create(@Body() dto: CreateTestResultRequestDto, @Req() req: any) {
    // Enforce project ownership via API key
    return this.testResultsService.create({ ...dto, projectId: req.apiKeyProjectId });
  }

  @UseGuards(ApiKeyGuard)
  @Post(':id/artifacts')
  @UseInterceptors(FileInterceptor('file', { storage: multerStorage }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload artifact (reporter, API key)' })
  async uploadArtifact(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('type') type: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!['screenshot', 'video', 'trace'].includes(type)) {
      throw new BadRequestException('type must be screenshot, video, or trace');
    }
    if (!file) throw new BadRequestException('No file uploaded');

    return this.testResultsService.addArtifact(
      id,
      type as 'screenshot' | 'video' | 'trace',
      file.path,
      req.apiKeyProjectId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('run/:runId')
  @ApiOperation({ summary: 'Get all test results for a run' })
  findByRun(@Param('runId', ParseUUIDPipe) runId: string) {
    return this.testResultsService.findByRun(runId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('flaky/:projectId')
  @ApiOperation({ summary: 'Check if a test is flaky (by title)' })
  checkFlaky(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('title') title: string,
  ) {
    return this.testResultsService.detectFlakiness(projectId, title);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get test result detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.testResultsService.findOne(id);
  }
}
