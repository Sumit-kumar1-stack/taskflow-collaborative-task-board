import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const memberships = await this.prisma.membership.findMany({ where: { userId }, select: { projectId: true } });
    const projectIds = memberships.map((m) => m.projectId);
    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const [assignedGroups, completedThisWeek, recentActivity, openGroups] = await Promise.all([
      this.prisma.task.groupBy({ by: ['status'], where: { assigneeId: userId, projectId: { in: projectIds } }, _count: { _all: true } }),
      this.prisma.task.count({ where: { assigneeId: userId, status: TaskStatus.DONE, completedAt: { gte: startOfWeek }, projectId: { in: projectIds } } }),
      this.prisma.activityLog.findMany({
        where: { projectId: { in: projectIds } },
        include: { project: { select: { id: true, name: true } }, actor: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      projectIds.length ? this.prisma.task.groupBy({ by: ['projectId'], where: { projectId: { in: projectIds }, status: { not: TaskStatus.DONE } }, _count: { _all: true } }) : Promise.resolve([]),
    ]);

    let projectWithMostOpenTasks = null;
    const mostOpen = openGroups.reduce((best, current) => !best || current._count._all > best._count._all ? current : best, openGroups[0]);
    if (mostOpen) {
      const project = await this.prisma.project.findUnique({ where: { id: mostOpen.projectId }, select: { id: true, name: true } });
      projectWithMostOpenTasks = project ? { ...project, openTasks: mostOpen._count._all } : null;
    }

    const assignedByStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 } as Record<string, number>;
    for (const g of assignedGroups) assignedByStatus[g.status] = g._count._all;

    return { projectCount: projectIds.length, assignedByStatus, completedThisWeek, projectWithMostOpenTasks, recentActivity };
  }
}
