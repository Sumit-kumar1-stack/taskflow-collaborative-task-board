# Vercel Deployment

TaskFlow is a monorepo and should be deployed as **two Vercel projects from the same GitHub repository**.

Vercel supports both Next.js and NestJS directly. Keep the web and API as independent projects so they have independent URLs and environment variables.

## 1. API project

- Repository: `taskflow-collaborative-task-board`
- Root Directory: `apps/api`
- Framework: NestJS / auto-detect
- Production branch: `main`

Required environment variables:

```env
DATABASE_URL=postgresql://...
ACCESS_TOKEN_SECRET=<long-random-secret>
REFRESH_TOKEN_SECRET=<different-long-random-secret>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
WEB_ORIGIN=https://<taskflow-web-domain>
NODE_ENV=production
```

Use a persistent hosted PostgreSQL database. Apply the checked-in Prisma migrations to that database before using the application.

The API build generates Prisma Client automatically.

## 2. Web project

- Repository: `taskflow-collaborative-task-board`
- Root Directory: `apps/web`
- Framework: Next.js / auto-detect
- Production branch: `main`

Required environment variables:

```env
NEXT_PUBLIC_API_URL=https://<taskflow-api-domain>/api
NEXT_PUBLIC_SOCKET_URL=https://<taskflow-api-domain>
```

After the web project has its final production domain, set the API project's `WEB_ORIGIN` to that exact HTTPS origin and redeploy the API.

## Realtime

TaskFlow uses Socket.IO. Vercel added WebSocket support for Functions in 2026, including support for higher-level libraries such as Socket.IO. Validate reconnect behavior and production WebSocket logs after deployment.

## Deployment verification

1. API health/application endpoint responds over HTTPS.
2. Signup/login works against the hosted PostgreSQL database.
3. Refresh-token cookie works across the production web/API origins.
4. Project creation and task operations persist.
5. Socket.IO connects and authenticated realtime updates arrive.
6. Logout revokes the refresh token.
