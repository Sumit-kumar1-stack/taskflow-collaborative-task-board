import { PrismaClient, ProjectRole, TaskPriority, TaskStatus, ActivityType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@taskflow.dev' },
    update: { name: 'Alice Owner', passwordHash },
    create: { name: 'Alice Owner', email: 'alice@taskflow.dev', passwordHash },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@taskflow.dev' },
    update: { name: 'Bob Member', passwordHash },
    create: { name: 'Bob Member', email: 'bob@taskflow.dev', passwordHash },
  });

  const existing = await prisma.project.findFirst({ where: { name: 'TaskFlow Demo', creatorId: alice.id } });
  const project = existing ?? await prisma.project.create({
    data: {
      name: 'TaskFlow Demo',
      description: 'Seeded shared project for collaboration and real-time demo.',
      creatorId: alice.id,
    },
  });

  await prisma.membership.upsert({
    where: { projectId_userId: { projectId: project.id, userId: alice.id } },
    update: { role: ProjectRole.OWNER },
    create: { projectId: project.id, userId: alice.id, role: ProjectRole.OWNER },
  });
  await prisma.membership.upsert({
    where: { projectId_userId: { projectId: project.id, userId: bob.id } },
    update: { role: ProjectRole.MEMBER },
    create: { projectId: project.id, userId: bob.id, role: ProjectRole.MEMBER },
  });

  const taskCount = await prisma.task.count({ where: { projectId: project.id } });
  if (taskCount === 0) {
    const now = new Date();
    const future = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const doneDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await prisma.task.createMany({
      data: [
        {
          projectId: project.id,
          createdById: alice.id,
          assigneeId: bob.id,
          title: 'Build authentication UI',
          description: 'Connect login form to JWT + refresh flow.',
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          dueDate: future,
        },
        {
          projectId: project.id,
          createdById: bob.id,
          assigneeId: alice.id,
          title: 'Review project membership rules',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
        },
        {
          projectId: project.id,
          createdById: alice.id,
          assigneeId: bob.id,
          title: 'Model TaskFlow tables',
          status: TaskStatus.DONE,
          priority: TaskPriority.LOW,
          completedAt: doneDate,
        },
      ],
    });
    await prisma.activityLog.create({
      data: { projectId: project.id, actorId: alice.id, type: ActivityType.MEMBER_INVITED, targetUserId: bob.id, metadata: { seed: true } },
    });
  }

  console.log('Seed complete');
  console.log('Alice: alice@taskflow.dev / Password123!');
  console.log('Bob:   bob@taskflow.dev / Password123!');
}

main().finally(() => prisma.$disconnect());
