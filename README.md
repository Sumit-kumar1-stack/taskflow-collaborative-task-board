# TaskFlow — Collaborative Task Management Platform

TaskFlow is a full-stack collaborative task-management application built for the **HyScaler AI Solutions Engineer Intern/Apprentice (Tech) coding assessment**.

It allows users to create projects, collaborate through project-scoped roles, create and assign tasks, manage work across a board, comment on tasks, review activity history, view personal workload and dashboard metrics, and receive authenticated real-time updates through Socket.IO.

The application is designed around backend-enforced authorization, relational data integrity, secure JWT authentication with refresh-token rotation, and project-scoped real-time communication.

---

## Key Features

### Authentication

- User signup with name, email and password
- Email and password validation
- Password hashing with bcrypt
- Short-lived JWT access tokens
- Longer-lived rotating refresh tokens
- Refresh token stored in an HttpOnly cookie
- Refresh-token hashes stored in PostgreSQL
- Automatic access-token refresh and request retry
- Logout with refresh-token revocation

### Projects and Membership

- Create projects
- Project creator automatically becomes `OWNER`
- Invite registered users by email
- Many-to-many User ↔ Project membership
- Project-specific roles:
  - `OWNER`
  - `MEMBER`
- Owner-only membership administration
- Owner-only project deletion
- Backend-enforced project isolation

### Task Management

Tasks support:

- Title
- Description
- Status
  - To Do
  - In Progress
  - Done
- Priority
  - Low
  - Medium
  - High
- Optional due date
- Optional project-member assignee
- Completed date

Users can:

- Create tasks
- Edit tasks
- Delete tasks
- Move tasks between statuses
- Assign tasks to members
- Comment on tasks
- View personal assigned tasks across projects

### Board and Backlog

- Three-column project board
- To Do
- In Progress
- Done
- Server-side search
- Server-side filtering
- Server-side sorting
- Server-side pagination
- Combined priority + assignee + title filtering

### Collaboration

- Real-time task creation
- Real-time task updates
- Real-time task movement
- Real-time task assignment
- Real-time comments
- Personal Assigned-to-Me updates
- Project activity feed
- Authenticated Socket.IO connections
- Project-specific rooms
- User-specific rooms

### Dashboard

The logged-in user's dashboard includes:

- Number of projects
- Assigned tasks by status
- Tasks completed this week
- Project with the most open tasks
- Personal recent activity

---

# Tech Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Socket.IO Client

## Backend

- NestJS
- TypeScript
- Socket.IO
- JWT authentication
- bcrypt

## Database

- PostgreSQL
- Prisma ORM

## Development / Infrastructure

- Docker Compose for local PostgreSQL
- npm workspaces
- Node.js built-in test runner
- Prisma migrations and seed scripts

---

# Architecture

```text
                       ┌────────────────────────────┐
                       │       Next.js Client       │
                       │                            │
                       │ Dashboard / Board / Tasks  │
                       │ Projects / Assigned / Auth │
                       └─────────────┬──────────────┘
                                     │
                         REST API    │    Socket.IO
                                     │
                    ┌────────────────▼────────────────┐
                    │          NestJS API             │
                    │                                 │
                    │ Authentication / Authorization  │
                    │ Projects / Tasks / Dashboard    │
                    │ Activity / Comments / Realtime  │
                    └────────────────┬────────────────┘
                                     │
                                   Prisma
                                     │
                    ┌────────────────▼────────────────┐
                    │          PostgreSQL             │
                    │                                 │
                    │ Users / Projects / Memberships  │
                    │ Tasks / Comments / Activities   │
                    │ Refresh Tokens                  │
                    └─────────────────────────────────┘
```

The REST API remains the authoritative source of application state.

Socket.IO is used to notify connected clients about relevant changes. After receiving an event, clients can update or refetch authoritative state through the REST API.

---

# Data Model

The core relational structure is:

```text
User 1 ----- * Membership * ----- 1 Project

User 1 ----- * Task (createdBy)
User 1 ----- * Task (assignee, optional)

Project 1 -- * Task

Task 1 ----- * Comment

Project 1 -- * ActivityLog

User 1 ----- * RefreshToken
```

A simplified relationship diagram:

```mermaid
erDiagram

    User ||--o{ Membership : belongs_to
    Project ||--o{ Membership : contains

    User ||--o{ Task : creates
    User ||--o{ Task : assigned_to
    Project ||--o{ Task : contains

    Task ||--o{ Comment : has
    User ||--o{ Comment : writes

    Project ||--o{ ActivityLog : records
    User ||--o{ ActivityLog : performs

    User ||--o{ RefreshToken : owns
```

## Membership

`Membership` is the join table between users and projects.

Each membership contains:

```text
userId
projectId
role
```

The pair:

```text
(userId, projectId)
```

is unique.

Roles are:

```text
OWNER
MEMBER
```

This allows:

- one user to belong to many projects
- one project to contain many users
- a role to exist specifically within each project

Removing a project member does **not** delete tasks they created.

If the removed user is currently assigned to project tasks, those tasks are automatically unassigned.

Deleting a project removes its dependent tasks, memberships, comments and project activity through the relational model and cascade behavior.

---

# Authentication and Refresh-Token Flow

TaskFlow uses two JWT types.

## Access Token

The access token is:

- short-lived
- returned after login/signup/refresh
- stored in frontend memory
- sent through the Authorization header

Example:

```http
Authorization: Bearer <access-token>
```

The access token is intentionally not stored as a long-lived browser value.

---

## Refresh Token

The refresh token:

- has a longer lifetime
- is stored in an `HttpOnly` cookie
- cannot be directly read by frontend JavaScript
- rotates after successful refresh

Only a cryptographic hash of the refresh token is stored in PostgreSQL.

The raw refresh token is never stored in the database.

---

## Login Flow

```text
Email + Password
       │
       ▼
Validate credentials
       │
       ▼
Verify bcrypt password hash
       │
       ▼
Create access token
       │
       ├──────────────► returned to frontend
       │
       ▼
Create refresh token
       │
       ▼
Hash refresh token
       │
       ├──────────────► hash stored in PostgreSQL
       │
       ▼
Raw refresh token
       │
       └──────────────► HttpOnly cookie
```

---

## Access-Token Expiry

When an authenticated frontend request receives `401` because its access token expired:

```text
Original API request
       │
       ▼
401 Unauthorized
       │
       ▼
POST /api/auth/refresh
       │
       ▼
Validate + rotate refresh token
       │
       ▼
New access token
       │
       ▼
Retry original request
```

The frontend performs this process transparently.

---

## Refresh-Token Rotation

Refresh-token consumption is atomic.

During rotation:

1. The presented token is verified.
2. The persisted refresh-token record is conditionally consumed/revoked.
3. A replacement token is created.
4. Both database operations execute transactionally.
5. The new refresh token replaces the previous HttpOnly cookie.

This prevents concurrent requests from successfully reusing the same refresh token.

---

## Logout

Logout:

1. Revokes the current refresh token.
2. Clears the refresh-token cookie.
3. Clears the frontend access token.

---

# Authorization Model

Authentication answers:

> Who is the user?

Project authorization answers:

> Is the user allowed to access this project?

Business authorization answers:

> Is this user allowed to perform this specific action?

All security-sensitive authorization is enforced on the backend.

Frontend visibility rules are used only for user experience.

---

## Project Membership

For project-scoped operations, the backend checks that the authenticated user has a membership for the requested project.

A non-member receives:

```http
403 Forbidden
```

---

## Owner Permissions

Only `OWNER` can:

- invite members
- remove members
- delete the project

A normal `MEMBER` can manage project tasks but cannot administer membership.

---

## Task Completion Rule

Only:

- the task's current assignee, or
- the project's owner

can move a task to:

```text
DONE
```

An ordinary member attempting to complete another member's task receives a clear authorization error.

This rule is enforced by the backend and cannot be bypassed by calling the API directly.

---

# Task Validation and Derived Data

The backend validates task operations.

Examples:

### Empty title

Rejected.

```text
Task title cannot be empty.
```

### Past due date on creation

Rejected.

```text
Due date cannot be in the past.
```

### Invalid assignee

A task can only be assigned to a current member of the same project.

### Member removal

When a member is removed:

- tasks they created remain
- their project access is revoked
- tasks currently assigned to them become unassigned

---

## Completed Date

When a task enters `DONE`:

```text
completedAt = current timestamp
```

When a task moves out of `DONE`:

```text
completedAt = null
```

This logic is enforced by the backend.

---

# Server-Side Task Querying

The backlog supports server-side:

- pagination
- title search
- assignee filtering
- priority filtering
- sorting

Example:

```http
GET /api/projects/:projectId/tasks
    ?page=1
    &pageSize=20
    &priority=HIGH
    &assigneeId=<user-id>
    &search=authentication
    &sortBy=dueDate
    &sortOrder=asc
```

Filtering and pagination are executed by the backend/database.

The frontend does not load all tasks and then slice them locally.

Supported sorting includes:

- priority
- due date
- created date

---

# Activity Log

Important project events are recorded by backend services.

Examples:

- task created
- task moved
- task assigned
- member invited
- member removed
- comment added

Activity is displayed in reverse chronological order.

Activity creation is coupled with the related backend operation rather than being generated by an untrusted frontend request.

---

# Real-Time Architecture

TaskFlow uses Socket.IO.

Polling is not used for the required collaboration features.

---

## Socket Authentication

The frontend connects using the current access token:

```ts
socket.handshake.auth.token
```

The server verifies the JWT before allowing an authenticated socket connection.

---

## User Rooms

Each authenticated user joins:

```text
user:<userId>
```

This room is used for personal events such as:

```text
assigned:changed
```

This allows the user's **Assigned to me** view to update when assignment changes.

---

## Project Rooms

When a client opens a project board, it requests:

```text
project:join
```

Before joining:

```text
project:<projectId>
```

the backend checks that the user is currently a member of that project.

Project updates are emitted to the project-specific room.

There is no global broadcast of project data.

---

## Member Removal

When a member is removed from a project:

- database membership is revoked
- assigned tasks are unassigned
- the user's active project sockets are removed from the corresponding project room

This prevents removed members from continuing to receive project events through an already-open socket.

---

## Reconnection

Socket.IO handles reconnect attempts.

After reconnection, the project UI:

1. rejoins the required project room
2. refetches authoritative REST data

This prevents missed WebSocket events from permanently desynchronizing the interface.

The application continues to work through REST even when the WebSocket connection is temporarily unavailable.

---

# UI / UX

The frontend uses a lightweight Tailwind-based component system instead of a large third-party UI framework.

Reusable components provide consistent:

- buttons
- cards
- form fields
- badges
- avatars
- dialogs
- confirmation states
- loading states
- skeletons
- error states
- empty states
- toasts
- status indicators
- priority indicators

The application includes:

- responsive navigation
- active-route indicators
- real-time connection status
- inline validation
- disabled/progress states during mutations
- confirmation dialogs for destructive actions
- keyboard focus styles
- responsive task-board layouts
- accessible form labels

---

# Application Pages

Main frontend routes include:

```text
/login
/signup
/dashboard
/projects
/assigned
/projects/:id/board
/projects/:id/backlog
/projects/:id/activity
```

---

# Local Setup

## Prerequisites

Install:

- Node.js 20+
- npm 10+
- Docker Desktop

---

## 1. Clone the Repository

```bash
git clone https://github.com/Sumit-kumar1-stack/taskflow-collaborative-task-board.git
cd taskflow-collaborative-task-board
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Create Environment Files

Windows CMD:

```bat
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
```

macOS/Linux:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Example API development values include:

```env
DATABASE_URL="postgresql://taskflow:taskflow@localhost:5434/taskflow?schema=public"

ACCESS_TOKEN_SECRET="replace-with-a-long-random-access-secret"
REFRESH_TOKEN_SECRET="replace-with-a-different-long-random-refresh-secret"

ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_TTL_DAYS="7"

WEB_ORIGIN="http://localhost:3000"
API_PORT="4000"

NODE_ENV="development"
```

For production, use strong independent secrets and HTTPS.

Real secrets must never be committed.

---

## 4. Start PostgreSQL

```bash
npm run db:up
```

The provided Docker configuration exposes PostgreSQL at:

```text
localhost:5434
```

---

## 5. Generate Prisma Client

```bash
npm run db:generate
```

---

## 6. Apply Database Migration

```bash
npm run db:migrate
```

The initial Prisma migration is committed to the repository.

---

## 7. Seed Test Data

```bash
npm run db:seed
```

The seed creates two test users and a shared project.

---

## 8. Start the Application

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

API:

```text
http://localhost:4000/api
```

Health endpoint:

```text
http://localhost:4000/api/health
```

---

# Seed Accounts

## Alice — Project Owner

```text
Email: alice@taskflow.dev
Password: Password123!
```

## Bob — Project Member

```text
Email: bob@taskflow.dev
Password: Password123!
```

Seed project:

```text
TaskFlow Demo
```

The seed also creates several sample tasks, including a task assigned across users.

---

# API Overview

## Authentication

```text
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
```

## Projects

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:projectId
DELETE /api/projects/:projectId
```

## Membership

```text
GET    /api/projects/:projectId/members
POST   /api/projects/:projectId/members
DELETE /api/projects/:projectId/members/:userId
```

## Activity

```text
GET    /api/projects/:projectId/activities
```

## Tasks

```text
GET    /api/projects/:projectId/tasks
POST   /api/projects/:projectId/tasks
PATCH  /api/projects/:projectId/tasks/:taskId
DELETE /api/projects/:projectId/tasks/:taskId
```

## Comments

```text
GET    /api/projects/:projectId/tasks/:taskId/comments
POST   /api/projects/:projectId/tasks/:taskId/comments
```

## Personal Tasks

```text
GET    /api/tasks/assigned-to-me
```

## Dashboard

```text
GET    /api/dashboard
```

---

# Verification and Testing

TaskFlow includes a backend hardening integration suite covering critical assessment requirements.

Run:

```bash
npm test
```

Final verified result:

```text
tests 22
pass 22
fail 0
cancelled 0
```

The integration suite covers:

1. unauthenticated protected access → `401`
2. authenticated non-member access → `403`
3. owner invitation permissions
4. duplicate membership → `409`
5. member cannot remove members
6. member cannot delete project
7. empty task title rejection
8. past due date rejection
9. non-member assignment rejection
10. non-assignee member cannot mark Done
11. owner can mark another assignee's task Done
12. entering Done sets `completedAt`
13. leaving Done clears `completedAt`
14. assignee can mark their task Done
15. member-created tasks survive member removal
16. removed member's assigned tasks become unassigned
17. removed member loses project access
18. refresh-token rotation is atomic
19. revoked refresh token cannot be reused
20. server-side pagination behavior
21. combined priority + assignee + search filtering
22. backend sorting by priority, due date and creation date

The test launcher starts an isolated NestJS process on a temporary API port and performs real HTTP integration checks against PostgreSQL.

When `TEST_DATABASE_URL` is provided, it is used by the integration suite.

---

## Production Build

Run:

```bash
npm run build
```

Verified:

```text
NestJS API build: PASS
Next.js production build: PASS
```

---

## Smoke Test

With PostgreSQL and the normal API running:

```bash
npm run smoke
```

The smoke test verifies:

- API/database health
- seeded owner login
- authenticated project access
- refresh-token rotation
- dashboard API

Verified final result:

```text
SMOKE PASS
```

---

## Prisma Validation

From `apps/api`:

```bash
npx prisma validate
```

Verified:

```text
Prisma schema valid
```

Check migration state with:

```bash
npx prisma migrate status
```

Verified:

```text
Database schema is up to date
```

---

# Critical Backend Rules

The backend enforces:

- unauthenticated protected request → `401`
- non-project-member access → `403`
- owner-only membership management
- owner-only project deletion
- non-empty task title
- future/current-valid due dates on creation
- assignment only to current project members
- member removal without deleting authored tasks
- automatic unassignment when an assignee is removed
- `completedAt` set when entering Done
- `completedAt` cleared when leaving Done
- only owner or current assignee can mark Done
- project-scoped task lookup
- server-side filtering/search/sorting/pagination
- backend-generated activity records
- authenticated and project-scoped Socket.IO rooms

---

# Error Handling

The application returns clear HTTP errors for expected failures.

Examples:

```text
401 Unauthorized
Authentication required or access token expired.
```

```text
403 Forbidden
Only the task assignee or project owner can mark this task as Done.
```

```text
400 Bad Request
Due date cannot be in the past.
```

```text
400 Bad Request
Assignee must be a member of this project.
```

```text
409 Conflict
User is already a member of this project.
```

Frontend views include explicit:

- loading states
- error states
- empty states
- inline form validation
- request-progress states

---

# What Was Challenging

## Refresh-token rotation

One important challenge was making refresh-token rotation safe under concurrent requests.

A simple read-then-revoke sequence could theoretically allow two simultaneous requests to validate the same refresh token before either revoked it.

The implementation was hardened so token consumption is performed conditionally and the old-token revocation plus replacement-token creation occur transactionally.

An integration test now verifies that concurrent refresh attempts cannot both succeed.

---

## Project Authorization

TaskFlow contains several different permission levels:

- authenticated user
- project member
- project owner
- task assignee

The backend therefore treats authentication and authorization as separate concerns.

Every project operation validates membership independently of what the frontend displays.

---

## Real-Time Security

Real-time updates cannot use a global broadcast because project data must only reach authorized project members.

The Socket.IO implementation authenticates the connection and validates project membership before allowing a socket to join:

```text
project:<projectId>
```

Personal events use:

```text
user:<userId>
```

This allows real-time collaboration without leaking project events to unrelated users.

---

## Member Removal

Removing a project member has multiple related effects:

- membership must be revoked
- authored tasks must remain
- currently assigned tasks must become unassigned
- activity must be recorded
- open sockets must lose access to the project room

The backend handles these consistency requirements as part of the membership-removal workflow.

---

# Known Limitations

The core assignment requirements are implemented.

Current limitations / intentionally omitted stretch functionality:

- Drag-and-drop task movement is not implemented; tasks use explicit status controls.
- Automated Socket.IO client tests are not currently included.
- PostgreSQL must be running for the integration test suite.
- Rate limiting is not currently implemented.
- The Prisma version emits a configuration deprecation warning related to `package.json#prisma`; the working Prisma major version was intentionally not upgraded during assessment hardening.
- The project has not been designed for multi-instance Socket.IO horizontal scaling; a production distributed deployment could introduce a shared adapter such as Redis.

These do not affect the required local assessment workflows.

---

# What I Would Improve With More Time

Possible future improvements include:

- drag-and-drop board interaction
- dedicated isolated test database in all environments
- Socket.IO integration tests
- email-based invitations
- task notifications
- richer activity filtering
- audit/export functionality
- rate limiting for authentication endpoints
- CI/CD pipeline
- production deployment
- Redis Socket.IO adapter for horizontally scaled deployments
- additional accessibility testing
- end-to-end browser automation

---

# AI Usage

I used AI tools during this assignment for:

- architecture review
- implementation assistance
- debugging
- edge-case analysis
- UI/UX refinement
- automated-test planning
- security-review assistance
- documentation review

I manually reviewed, ran, tested and modified suggestions before integrating them.

The main concepts I focused on understanding during the process were:

- JWT access-token authentication
- refresh-token rotation
- HttpOnly cookies
- backend authorization
- relational membership modeling
- transaction boundaries
- IDOR prevention
- assignment rules
- server-side querying
- project-scoped WebSocket rooms
- user-scoped WebSocket events
- reconnect and consistency behavior

AI was used as an engineering assistant rather than as a substitute for understanding the implementation.

---

# Demo Scenario

The recommended collaboration demonstration uses two browser sessions:

```text
Alice — Owner
Bob   — Member
```

Flow:

```text
Alice logs in
      ↓
Alice creates a project
      ↓
Alice invites Bob
      ↓
Bob opens the project
      ↓
Alice creates a task
      ↓
Alice assigns the task to Bob
      ↓
Bob's Assigned-to-Me view updates
      ↓
Task moves across the board
      ↓
Other browser updates live
      ↓
Bob adds a comment
      ↓
Alice receives the update
      ↓
Activity feed updates
      ↓
Dashboard metrics displayed
```

---

# Repository

GitHub:

https://github.com/Sumit-kumar1-stack/taskflow-collaborative-task-board

---

# Author

**Sumit Kumar**

TaskFlow  
HyScaler AI Solutions Engineer Intern/Apprentice (Tech) Coding Assessment
