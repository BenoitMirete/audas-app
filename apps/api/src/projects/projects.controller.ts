import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.remove(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add or update project member' })
  addMember(@Param('id', ParseUUIDPipe) projectId: string, @Body() dto: AddMemberDto) {
    return this.projectsService.addMember(projectId, dto.userId, dto.role);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.projectsService.removeMember(projectId, userId);
  }

  @Post(':id/api-keys')
  @ApiOperation({ summary: 'Create API key — returned once, store securely' })
  createApiKey(@Param('id', ParseUUIDPipe) projectId: string, @Body() dto: CreateApiKeyDto) {
    return this.projectsService.createApiKey(projectId, dto.label);
  }

  @Get(':id/api-keys')
  @ApiOperation({ summary: 'List API keys for a project' })
  listApiKeys(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.projectsService.listApiKeys(projectId);
  }

  @Delete(':id/api-keys/:keyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an API key' })
  deleteApiKey(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('keyId', ParseUUIDPipe) keyId: string,
  ) {
    return this.projectsService.deleteApiKey(projectId, keyId);
  }
}
