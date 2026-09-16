export type User = { id: string; name: string; email: string };
export type Membership = { id: string; role: 'OWNER' | 'MEMBER'; user: User };
export type Project = { id: string; name: string; description?: string | null; creatorId: string; memberships?: Membership[]; _count?: { tasks: number } };
export type Task = {
  id: string; projectId: string; title: string; description?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'; priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string | null; completedAt?: string | null; assigneeId?: string | null;
  assignee?: User | null; createdBy?: User; project?: { id: string; name: string }; _count?: { comments: number };
};

export type Comment = { id: string; content: string; createdAt: string; author: User };
export type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
export type TaskListResponse = { items: Task[]; pagination: Pagination };
export type ActivityType = 'TASK_CREATED' | 'TASK_MOVED' | 'TASK_ASSIGNED' | 'TASK_UNASSIGNED' | 'TASK_UPDATED' | 'TASK_DELETED' | 'MEMBER_INVITED' | 'MEMBER_REMOVED' | 'COMMENT_ADDED';
export type Activity = {
  id: string;
  type: ActivityType;
  createdAt: string;
  actor: User;
  project?: { id: string; name: string };
  task?: { id: string; title: string } | null;
  targetUser?: User | null;
  metadata?: Record<string, unknown> | null;
};
export type DashboardData = {
  projectCount: number;
  assignedByStatus: Record<Task['status'], number>;
  completedThisWeek: number;
  projectWithMostOpenTasks: { id: string; name: string; openTasks: number } | null;
  recentActivity: Activity[];
};
