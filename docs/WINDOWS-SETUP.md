# Windows setup — exact first run

Open **CMD** in the extracted `taskflow-starter` folder.

```bat
node -v
npm -v
docker --version
```

Recommended: Node 20+ and Docker Desktop running.

## Install

```bat
npm install
```

## Create environment files

```bat
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
```

Open `apps\api\.env` and replace both JWT secrets with long random strings before final submission.

## Start PostgreSQL

```bat
npm run db:up
```

Optional check:

```bat
docker ps
```

You should see `taskflow-postgres` and host port `5434`.

## Initialize database

```bat
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Start TaskFlow

```bat
npm run dev
```

Open:

```text
http://localhost:3000
```

Seed owner:

```text
alice@taskflow.dev
Password123!
```

Seed member:

```text
bob@taskflow.dev
Password123!
```

For a two-user test, login as Alice in a normal Chrome window and Bob in an Incognito window.

## Smoke test

With the API still running, open a second CMD in the project folder:

```bat
npm run smoke
```

Expected final line:

```text
SMOKE PASS
```

## If port 5434 is busy

Change the host side in `docker-compose.yml`, for example:

```yaml
ports:
  - "5435:5432"
```

Then change `DATABASE_URL` in `apps\api\.env` to use port `5435`.

## First Git history

After you have run the project and understood the starter:

```bat
git init
git add .
git commit -m "chore: bootstrap TaskFlow assessment"
```

Do **not** stop at one giant commit. Make your later changes granular, for example:

```text
feat(auth): harden refresh token lifecycle
feat(projects): improve member management
feat(tasks): polish board and validation
feat(realtime): verify scoped collaboration updates
test(api): add authorization coverage
docs: finalize assessment README
```
