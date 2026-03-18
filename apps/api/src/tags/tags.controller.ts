import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'List all tags for a project' })
  findByProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.tagsService.findByProject(projectId);
  }

  @Get('project/:projectId/stats')
  @ApiOperation({ summary: 'Get pass rate per tag for a project' })
  getTagStats(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.tagsService.getTagStats(projectId);
  }
}
