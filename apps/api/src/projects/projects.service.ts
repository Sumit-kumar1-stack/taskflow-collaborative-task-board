import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType, ProjectRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { TaskflowGateway } from '../realtime/taskflow.gateway';
import { CreateProjectDto } from './projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService, private readonly gateway: TaskflowGateway) {}

  async requireMember(projectId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({ where: { projectId_userId: { projectId, userId } }, include: { project: true } });
    if (!membership) throw new ForbiddenException('You are not a member of this project');
    return membership;
  }

  async requireOwner(projectId: string, userId: string) {
    const membership = await this.requireMember(projectId, userId);
    if (membership.role !== ProjectRole.OWNER) throw new ForbiddenException('Only the project owner can perform this action');
    return membership;
  }

  async create(userId: string, dto: CreateProjectDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Project name cannot be empty');
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({ data: { name, description: dto.description?.trim() || null, creatorId: userId } });
      await tx.membership.create({ data: { projectId: project.id, userId, role: ProjectRole.OWNER } });
      return project;
    });
  }

  async list(userId: string) {
    return this.prisma.project.findMany({
      where: { memberships: { some: { userId } } },
      include: { memberships: { include: { user: { select: { id: true, name: true, email: true } } } }, _count: { select: { tasks: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(projectId: string, userId: string) {
    await this.requireMember(projectId, userId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { memberships: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async members(projectId: string, userId: string) {
    await this.requireMember(projectId, userId);
    return this.prisma.membership.findMany({ where: { projectId }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } });
  }

  async invite(projectId: string, actorId: string, emailInput: string) {
    await this.requireOwner(projectId, actorId);
    const email = emailInput.trim().toLowerCase();
    const target = await this.prisma.user.findUnique({ where: { email } });
    if (!target) throw new NotFoundException('No registered user found with that email');
    const existing = await this.prisma.membership.findUnique({ where: { projectId_userId: { projectId, userId: target.id } } });
    if (existing) throw new ConflictException('User is already a member of this project');

    const membership = await this.prisma.$transaction(async (tx) => {
      const created = await tx.membership.create({ data: { projectId, userId: target.id, role: ProjectRole.MEMBER }, include: { user: { select: { id: true, name: true, email: true } } } });
      await tx.activityLog.create({ data: { projectId, actorId, type: ActivityType.MEMBER_INVITED, targetUserId: target.id, metadata: { email: target.email } } });
      return created;
    });
    this.gateway.emitProject(projectId, 'member:invited', membership);
    this.gateway.emitProject(projectId, 'activity:changed', { projectId });
    return membership;
  }

  async removeMember(projectId: string, actorId: string, targetUserId: string) {
    await this.requireOwner(projectId, actorId);
    const target = await this.prisma.membership.findUnique({ where: { projectId_userId: { projectId, userId: targetUserId } } });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === ProjectRole.OWNER) throw new BadRequestException('Project owner cannot be removed');

    const result = await this.prisma.$transaction(async (tx) => {
      const unassigned = await tx.task.updateMany({ where: { projectId, assigneeId: targetUserId }, data: { assigneeId: null } });
      await tx.membership.delete({ where: { projectId_userId: { projectId, userId: targetUserId } } });
      await tx.activityLog.create({ data: { projectId, actorId, type: ActivityType.MEMBER_REMOVED, targetUserId, metadata: { autoUnassignedTasks: unassigned.count } } });
      return { removedUserId: targetUserId, autoUnassignedTasks: unassigned.count };
    });

    this.gateway.evictUserFromProject(targetUserId, projectId);
    this.gateway.emitProject(projectId, 'member:removed', result);
    this.gateway.emitProject(projectId, 'tasks:changed', { projectId });
    this.gateway.emitProject(projectId, 'activity:changed', { projectId });
    this.gateway.emitUser(targetUserId, 'project:access-revoked', { projectId });
    this.gateway.emitUser(targetUserId, 'assigned:changed', { projectId });
    return result;
  }

  async removeProject(projectId: string, userId: string) {
    await this.requireOwner(projectId, userId);
    await this.prisma.project.delete({ where: { id: projectId } });
    this.gateway.emitProject(projectId, 'project:deleted', { projectId });
    return { ok: true };
  }

  async activities(projectId: string, userId: string, limit = 50) {
    await this.requireMember(projectId, userId);
    return this.prisma.activityLog.findMany({
      where: { projectId },
      include: {
        actor: { select: { id: true, name: true, email: true } },
        targetUser: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }
}
