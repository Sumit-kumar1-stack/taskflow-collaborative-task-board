import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/request-user';
import { AddCommentDto, CreateTaskDto, TaskQueryDto, UpdateTaskDto } from './tasks.dto';
import { TasksService } from './tasks.service';

@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('projects/:projectId/tasks')
  list(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string, @Query() query: TaskQueryDto) {
    return this.tasks.list(projectId, user.id, query);
  }

  @Post('projects/:projectId/tasks')
  create(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string, @Body() dto: CreateTaskDto) {
    return this.tasks.create(projectId, user.id, dto);
  }

  @Patch('projects/:projectId/tasks/:taskId')
  update(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string, @Param('taskId') taskId: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(projectId, taskId, user.id, dto);
  }

  @Delete('projects/:projectId/tasks/:taskId')
  remove(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string, @Param('taskId') taskId: string) {
    return this.tasks.remove(projectId, taskId, user.id);
  }

  @Get('projects/:projectId/tasks/:taskId/comments')
  comments(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string, @Param('taskId') taskId: string) {
    return this.tasks.comments(projectId, taskId, user.id);
  }

  @Post('projects/:projectId/tasks/:taskId/comments')
  addComment(@CurrentUser() user: RequestUser, @Param('projectId') projectId: string, @Param('taskId') taskId: string, @Body() dto: AddCommentDto) {
    return this.tasks.addComment(projectId, taskId, user.id, dto);
  }

  @Get('tasks/assigned-to-me')
  assigned(@CurrentUser() user: RequestUser) { return this.tasks.assignedToMe(user.id); }
}
