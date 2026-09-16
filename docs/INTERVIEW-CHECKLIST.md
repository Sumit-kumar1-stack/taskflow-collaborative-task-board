# TaskFlow follow-up interview checklist

Be able to explain and modify these without AI:

1. Why access token is short-lived and in memory.
2. Why refresh token is HttpOnly and stored hashed server-side.
3. How refresh-token rotation works and what happens when an old token is replayed.
4. Why Membership is a join table instead of an array of user IDs.
5. Why every project service method re-checks membership/owner authorization on the backend.
6. Why marking DONE is checked server-side against owner/assignee.
7. What happens to tasks when a member is removed.
8. Why `completedAt` is distinct from `updatedAt`.
9. How task filters + search + pagination become Prisma WHERE/skip/take/orderBy.
10. Why Socket.IO rooms are `user:<id>` and `project:<id>` instead of `io.emit`.
11. Why project room join re-checks Membership.
12. How reconnect + REST refetch recovers events missed during downtime.
13. Why activity writes are inside the same database transaction as core mutations.
14. Which database relations cascade and which intentionally do not.
15. How you would add Redis adapter only when horizontally scaling multiple socket instances.
