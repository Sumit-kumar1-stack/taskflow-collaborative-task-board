import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType, Prisma, ProjectRole, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { TaskflowGateway } from '../realtime/taskflow.gateway';
import { AddCommentDto, CreateTaskDto, TaskQueryDto, UpdateTaskDto } from './tasks.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService, private readonly projects: ProjectsService, private readonly gateway: TaskflowGateway) {}

  private async ensureAssignee(projectId: string, assigneeId?: string | null) {
    if (!assigneeId) return;
    const membership = await this.prisma.membership.findUnique({ where: { projectId_userId: { projectId, userId: assigneeId } } });
    if (!membership) throw new BadRequestException('Assignee must be a current member of this project');
  }

  private validateCreationDueDate(dueDate?: string) {
    if (!dueDate) return;
    const parsed = new Date(dueDate);
    if (parsed.getTime() < Date.now()) throw new BadRequestException('Due date cannot be in the past');
  }

  private async ensureCanMarkDone(projectId: string, actorId: string, assigneeId: string | null) {
    const membership = await this.projects.requireMember(projectId, actorId);
    if (membership.role !== ProjectRole.OWNER && assigneeId !== actorId) {
      throw new ForbiddenException('Only the task assignee or project owner can mark this task as Done');
    }
  }

  async list(projectId: string, userId: string, query: TaskQueryDto) {
    await this.projects.requireMember(projectId, userId);
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const sortBy = ['priority', 'dueDate', 'createdAt'].includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.TaskWhereInput = {
      projectId,
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.search?.trim() ? { title: { contains: query.search.trim(), mode: 'insensitive' } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { [sortBy]: sortOrder } as any,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);
    return { items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  }

  async create(projectId: string, actorId: string, dto: CreateTaskDto) {
    const membership = await this.projects.requireMember(projectId, actorId);
    const title = dto.title.trim();
    if (!title) throw new BadRequestException('Task title cannot be empty');
    this.validateCreationDueDate(dto.dueDate);
    await this.ensureAssignee(projectId, dto.assigneeId);
    const initialStatus = dto.status ?? TaskStatus.TODO;
    if (initialStatus === TaskStatus.DONE && membership.role !== ProjectRole.OWNER && dto.assigneeId !== actorId) {
      throw new ForbiddenException('Only the task assignee or project owner can mark this task as Done');
    }

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          projectId,
          createdById: actorId,
          assigneeId: dto.assigneeId || null,
          title,
          description: dto.description?.trim() || null,
          status: initialStatus,
          priority: dto.priority,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          completedAt: initialStatus === TaskStatus.DONE ? new Date() : null,
        },
        include: { assignee: { select: { id: true, name: true, email: true } }, createdBy: { select: { id: true, name: true, email: true } }, _count: { select: { comments: true } } },
      });
      await tx.activityLog.create({ data: { projectId, actorId, type: ActivityType.TASK_CREATED, taskId: created.id, metadata: { title: created.title } } });
      if (created.assigneeId) await tx.activityLog.create({ data: { projectId, actorId, type: ActivityType.TASK_ASSIGNED, taskId: created.id, targetUserId: created.assigneeId } });
      return created;
    });

    this.gateway.emitProject(projectId, 'task:created', task);
    this.gateway.emitProject(projectId, 'activity:changed', { projectId });
    if (task.assigneeId) this.gateway.emitUser(task.assigneeId, 'assigned:changed', { projectId, taskId: task.id });
    return task;
  }

  async update(projectId: string, taskId: string, actorId: string, dto: UpdateTaskDto) {
    await this.projects.requireMember(projectId, actorId);
    const current = await this.prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!current) throw new NotFoundException('Task not found');

    if (dto.title !== undefined && !dto.title.trim()) throw new BadRequestException('Task title cannot be empty');
    if (dto.assigneeId !== undefined) await this.ensureAssignee(projectId, dto.assigneeId || null);
    const nextAssigneeId = dto.assigneeId === undefined ? current.assigneeId : (dto.assigneeId || null);
    if (dto.status === TaskStatus.DONE && current.status !== TaskStatus.DONE) await this.ensureCanMarkDone(projectId, actorId, current.assigneeId);

    const moved = dto.status !== undefined && dto.status !== current.status;
    const assignmentChanged = dto.assigneeId !== undefined && nextAssigneeId !== current.assigneeId;
    const nextCompletedAt = dto.status === TaskStatus.DONE && current.status !== TaskStatus.DONE
      ? new Date()
      : dto.status !== undefined && dto.status !== TaskStatus.DONE && current.status === TaskStatus.DONE
        ? null
        : current.completedAt;

    const task = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined ? { description: typeof dto.description === 'string' ? (dto.description.trim() || null) : null } : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.status !== undefined ? { status: dto.status, completedAt: nextCompletedAt } : {}),
          ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
          ...(dto.assigneeId !== undefined ? { assigneeId: nextAssigneeId } : {}),
        },
        include: { assignee: { select: { id: true, name: true, email: true } }, createdBy: { select: { id: true, name: true, email: true } }, _count: { select: { comments: true } } },
      });
      if (moved) await tx.activityLog.create({ data: { projectId, actorId, type: ActivityType.TASK_MOVED, taskId, metadata: { from: current.status, to: dto.status } } });
      if (assignmentChanged) await tx.activityLog.create({ data: { projectId, actorId, type: nextAssigneeId ? ActivityType.TASK_ASSIGNED : ActivityType.TASK_UNASSIGNED, taskId, targetUserId: nextAssigneeId, metadata: { previousAssigneeId: current.assigneeId } } });
      if (!moved && !assignmentChanged) await tx.activityLog.create({ data: { projectId, actorId, type: ActivityType.TASK_UPDATED, taskId } });
      return updated;
    });

    this.gateway.emitProject(projectId, 'task:updated', task);
    this.gateway.emitProject(projectId, 'activity:changed', { projectId });
    if (assignmentChanged && current.assigneeId) this.gateway.emitUser(current.assigneeId, 'assigned:changed', { projectId, taskId });
    if (task.assigneeId) this.gateway.emitUser(task.assigneeId, 'assigned:changed', { projectId, taskId });
    return task;
  }

  async remove(projectId: string, taskId: string, actorId: string) {
    await this.projects.requireMember(projectId, actorId);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.activityLog.create({ data: { projectId, actorId, type: ActivityType.TASK_DELETED, metadata: { taskId, title: task.title } } });
      await tx.task.delete({ where: { id: taskId } });
    });
    this.gateway.emitProject(projectId, 'task:deleted', { taskId });
    this.gateway.emitProject(projectId, 'activity:changed', { projectId });
    if (task.assigneeId) this.gateway.emitUser(task.assigneeId, 'assigned:changed', { projectId, taskId });
    return { ok: true };
  }

  async comments(projectId: string, taskId: string, actorId: string) {
    await this.projects.requireMember(projectId, actorId);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, projectId }, select: { id: true } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.comment.findMany({ where: { taskId }, include: { author: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } });
  }

  async addComment(projectId: string, taskId: string, actorId: string, dto: AddCommentDto) {
    await this.projects.requireMember(projectId, actorId);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, projectId }, select: { id: true } });
    if (!task) throw new NotFoundException('Task not found');
    const content = dto.content.trim();
    if (!content) throw new BadRequestException('Comment cannot be empty');
    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({ data: { taskId, authorId: actorId, content }, include: { author: { select: { id: true, name: true, email: true } } } });
      await tx.activityLog.create({ data: { projectId, actorId, type: ActivityType.COMMENT_ADDED, taskId, metadata: { commentId: created.id } } });
      return created;
    });
    this.gateway.emitProject(projectId, 'comment:created', { taskId, comment });
    this.gateway.emitProject(projectId, 'activity:changed', { projectId });
    return comment;
  }

  async assignedToMe(userId: string) {
    return this.prisma.task.findMany({
      where: { assigneeId: userId, project: { memberships: { some: { userId } } } },
      include: { project: { select: { id: true, name: true } }, _count: { select: { comments: true } } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }
}
