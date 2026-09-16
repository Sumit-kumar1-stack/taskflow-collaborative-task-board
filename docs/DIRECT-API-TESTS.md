# Direct API tests to perform before submission

The reviewers explicitly say they may call your API directly. Verify these behaviors with Postman/Bruno/curl after local setup.

1. Protected endpoint with no `Authorization` header -> 401.
2. Invalid/expired access JWT -> 401.
3. Valid refresh cookie -> returns a new access token and rotates the refresh token.
4. A user who is not a project member -> 403 for project/tasks/comments/activity.
5. MEMBER attempts invite/remove/delete project -> 403.
6. Empty task title -> 400.
7. Past creation due date -> 400.
8. Assignee not in project -> 400.
9. Normal MEMBER who is not task assignee attempts `status=DONE` -> 403.
10. Current assignee marks DONE -> 200 and `completedAt` becomes non-null.
11. Move DONE back to IN_PROGRESS -> `completedAt` becomes null.
12. Owner removes member -> membership disappears, tasks created by that user remain, tasks assigned to that user become unassigned.
13. Removed member's existing socket is evicted from `project:<id>` and no longer receives project events.
14. Delete project -> tasks/memberships/comments/activity disappear through relational cascades.
15. Combined `priority + assigneeId + search` query returns only matching tasks and pagination metadata.
