import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/request-user';
import { CreateProjectDto, InviteMemberDto } from './projects.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) { return this.projects.list(user.id); }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProjectDto) { return this.projects.create(user.id, dto); }

  @Get(':projectId')
  get(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string) { return this.projects.get(projectId, user.id); }

  @Delete(':projectId')
  remove(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string) { return this.projects.removeProject(projectId, user.id); }

  @Get(':projectId/members')
  members(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string) { return this.projects.members(projectId, user.id); }

  @Post(':projectId/members')
  invite(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string, @Body() dto: InviteMemberDto) { return this.projects.invite(projectId, user.id, dto.email); }

  @Delete(':projectId/members/:userId')
  removeMember(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string, @Param('userId') targetUserId: string) { return this.projects.removeMember(projectId, user.id, targetUserId); }

  @Get(':projectId/activities')
  activities(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string, @Query('limit') limit?: string) {
    return this.projects.activities(projectId, user.id, limit ? Number(limit) : 50);
  }
}
