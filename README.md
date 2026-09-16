# TaskFlow — HyScaler Coding Assessment Starter

TaskFlow is a collaborative project/task board with project-scoped membership, JWT access + refresh authentication, task assignment, comments, activity logs, dashboard metrics, and authenticated Socket.IO updates.

> This repository is intentionally a strong **starter/base implementation**. Before submission, read every file, run the edge-case checklist, improve the UI, add tests, make granular commits, and replace this note with your own final README wording.

## Stack

- Frontend: Next.js (App Router), React, TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript
- Database: PostgreSQL + Prisma
- Auth: short-lived JWT access token + rotating refresh token cookie
- Realtime: Socket.IO with authenticated user/project rooms

## Why this architecture

NestJS gives explicit modules/services/guards for backend authorization. Prisma makes relational ownership and many-to-many memberships easy to inspect. PostgreSQL gives a real relational database with cascades/constraints. Socket.IO provides reconnect behavior and room-based broadcasts without polling.

## Data model

```text
User 1---* Membership *---1 Project
User 1---* Task(createdBy)
User 1---* Task(assignee, optional)
Project 1---* Task
Task 1---* Comment
Project 1---* ActivityLog
User 1---* RefreshToken
```

`Membership(userId, projectId)` is unique and stores `OWNER | MEMBER`. Project deletion cascades tasks, memberships, comments (through tasks), and activity. Member removal does **not** delete tasks they created; tasks currently assigned to the removed member are auto-unassigned.

## Authentication / refresh-token flow

1. Signup/login validates credentials and returns a short-lived access token.
2. The access token is stored **only in frontend memory**, reducing long-lived token exposure in browser storage.
3. A longer-lived refresh JWT is stored in an **HttpOnly, SameSite cookie**. JavaScript cannot read it.
4. A SHA-256 hash of each refresh token is stored in PostgreSQL. The raw refresh token is never stored server-side.
5. When an API request receives 401, the frontend calls `/auth/refresh` with credentials, receives a new access token, and retries the original request once.
6. Refresh tokens rotate: the used token is revoked and a new one is issued.
7. Logout revokes the current refresh token, clears its cookie, and clears the in-memory access token.

Production should use HTTPS so the refresh cookie can be `Secure`.

## WebSocket security

- Client connects with the current access JWT in `socket.handshake.auth.token`.
- The gateway verifies the JWT before accepting the connection.
- Each authenticated socket joins `user:<userId>` for personal assignment updates.
- A client must explicitly request `project:join` before receiving project events.
- The gateway queries `Membership` before joining `project:<projectId>`.
- Task/comment/member/activity events are emitted to that project room, never as a global broadcast.
- When assignment changes, the assignee's `user:<userId>` room receives an `assigned:changed` event.
- Socket.IO reconnects automatically. The project page rejoins its project room and refetches current REST state after reconnect, so missed events do not permanently desynchronize the UI.

## Local setup (Windows/macOS/Linux)

### Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (recommended for PostgreSQL)

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment files

Copy `.env.example` to both of these locations:

```text
apps/api/.env
apps/web/.env.local
```

On Windows CMD:

```bat
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
```

### 3. Start PostgreSQL

```bash
npm run db:up
```

PostgreSQL is exposed on localhost port **5434** to avoid collisions with a local Postgres installation.

### 4. Generate Prisma, migrate, and seed

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

The initial migration is already committed in `apps/api/prisma/migrations`, so a clean clone applies it without generating a new migration.

### 5. Start frontend + backend

```bash
npm run dev
```

Open:

- Frontend: http://localhost:3000
- API health: http://localhost:4000/api/health

## Seed credentials

- `alice@taskflow.dev` / `Password123!` — project owner
- `bob@taskflow.dev` / `Password123!` — member

Seed project: **TaskFlow Demo** with several tasks, including one assigned to Bob.

## API overview

```text
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/projects
POST   /api/projects
GET    /api/projects/:projectId
DELETE /api/projects/:projectId
GET    /api/projects/:projectId/members
POST   /api/projects/:projectId/members
DELETE /api/projects/:projectId/members/:userId
GET    /api/projects/:projectId/activities

GET    /api/projects/:projectId/tasks?page=1&pageSize=20&priority=HIGH&assigneeId=...&search=...&sortBy=dueDate&sortOrder=asc
POST   /api/projects/:projectId/tasks
PATCH  /api/projects/:projectId/tasks/:taskId
DELETE /api/projects/:projectId/tasks/:taskId
GET    /api/projects/:projectId/tasks/:taskId/comments
POST   /api/projects/:projectId/tasks/:taskId/comments

GET    /api/tasks/assigned-to-me
GET    /api/dashboard
```

## Critical backend rules implemented

- Protected endpoint without authentication -> `401`.
- Non-member project access -> `403`.
- Only owner can invite/remove members or delete a project.
- Empty task title -> `400`.
- Past due date on task creation -> `400`.
- Assignee must be a current project member.
- Removing a member auto-unassigns tasks assigned to them, without deleting tasks they created.
- Moving a task to DONE sets `completedAt`; moving it out clears `completedAt`.
- Only project owner or current assignee can mark a task DONE.
- Server does filtering/search/sorting/pagination; frontend does not load-all-and-slice.
- Key events are written to `ActivityLog` by backend services.

## Before you submit

Do not submit this starter unchanged. At minimum:

1. Read and understand every auth/RBAC/socket service.
2. Improve branding/layout and mobile handling.
3. Add 3–6 automated tests around membership, DONE permission, refresh rotation, and assignment validation.
4. Test with two browser windows simultaneously.
5. Test direct API calls as a non-member.
6. Clean-clone test the README commands.
7. Replace starter comments/known issues with your actual findings.
8. Make granular Git commits while you improve it.
9. Record a 4–6 minute demo.
10. Put the public GitHub URL + Loom URL in the final PDF attached to the existing hiring email thread.

## Suggested demo flow

Two windows side-by-side -> login Alice/Bob -> Alice creates project -> invites Bob -> creates and assigns task -> Bob's Assigned view updates -> move task -> other board updates live -> add comment -> show activity feed -> show dashboard.

## AI usage disclosure template

I used AI tools for architecture review, implementation assistance, and edge-case discussion. I manually reviewed, ran, debugged, and changed the generated suggestions. The main concepts I focused on understanding were refresh-token rotation, backend membership/role enforcement, relational cascades, transactional activity logging, and project-scoped WebSocket rooms.
