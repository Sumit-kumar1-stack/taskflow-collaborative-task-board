# HyScaler requirement map

Use this as a final pre-submission checklist. `BASE` means the starter already contains an implementation; you still need to run and verify it locally.

| # | Requirement | Starter location | Status |
|---|---|---|---|
| 1 | Signup/name/email/password validation | `auth.dto.ts`, signup UI | BASE |
| 2 | JWT access + refresh flow | `auth.service.ts`, `auth.ts` | BASE |
| 3 | bcrypt password hashing | `auth.service.ts` | BASE |
| 4 | Project membership isolation backend | `ProjectsService.requireMember` | BASE |
| 5 | 401 + transparent refresh/retry | `JwtAuthGuard`, `apiFetch` | BASE |
| 6 | Create projects, creator owner | `ProjectsService.create` | BASE |
| 7 | Invite registered user by email, M:N | `Membership`, `invite` | BASE |
| 8 | OWNER/MEMBER role enforcement | `requireOwner` | BASE |
| 9 | Remove member preserves created tasks; delete project cascades | project service + Prisma FKs | BASE |
| 10 | Required task fields | `Task` schema + DTO | BASE |
| 11 | List/edit/delete/move tasks | task service + board UI | BASE |
| 12 | Board columns | board page | BASE |
| 13 | Assignee+priority filters + title search | backlog query | BASE |
| 14 | Server pagination + sorting | `TasksService.list` | BASE |
| 15 | Empty title/past due date/non-member assignee validation | task service | BASE |
| 16 | completedAt set/cleared by DONE transitions | task update service | BASE |
| 17 | Removed member cannot remain assigned | auto-unassign transaction | BASE |
| 18 | Assigned-to-me across projects | endpoint + live page | BASE |
| 19 | Comments, author, timestamp | Comment model/service/UI | BASE |
| 20 | Only assignee/owner marks DONE | `ensureCanMarkDone` | BASE |
| 21 | Project activity log | ActivityLog + activity page | BASE |
| 22 | WebSockets, not polling | Socket.IO gateway | BASE |
| 23 | Board events live to other project members | project room events | BASE |
| 24 | Assigned-to-me live updates | `user:<id>` room | BASE |
| 25 | Authenticated/scoped sockets | JWT handshake + membership join + removal eviction | BASE |
| 26 | Reconnect + REST recovery | client reconnect/rejoin/refetch | BASE |
| 27 | Dashboard metrics/feed | DashboardService + UI | BASE |

## Still recommended before submission

- Add a small automated Jest/Supertest suite for auth, role enforcement and DONE permission.
- Improve visual design and responsive behavior to make the project clearly your own.
- Verify refresh behavior by shortening access token TTL locally to e.g. `20s`.
- Verify every backend rule with direct API calls, not only via the UI.
- Test two separate browser sessions (regular + incognito) for cookies and real-time events.
- Deploy only after local behavior is stable.
