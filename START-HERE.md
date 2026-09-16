# START HERE — Sumit / TaskFlow

This ZIP is a working-oriented base, not a final submission to upload unchanged.

## First local run

```bat
npm install
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
npm run db:up
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

Login 1 (owner): `alice@taskflow.dev` / `Password123!`

Login 2 (member): `bob@taskflow.dev` / `Password123!`

Use normal Chrome + Incognito for the two-user WebSocket test.

## Your first job after it runs

1. Read `README.md` completely.
2. Read `docs/REQUIREMENTS-MAP.md` and test each BASE item.
3. Read `docs/DIRECT-API-TESTS.md` because HyScaler says they will test the API directly.
4. Read `docs/INTERVIEW-CHECKLIST.md` and make sure you can explain every answer.
5. Change the UI/branding so the submission is recognizably yours.
6. Add focused automated tests only after the core flow is stable.
7. Commit your own improvements incrementally.

## High-value improvements to make yourself

- Add Jest/Supertest coverage for non-member access, owner-only actions, DONE permission, and refresh rotation.
- Add a toast system and better skeleton/loading presentation.
- Add drag-and-drop only if the core is already fully tested.
- Add deployment only after local two-user behavior is reliable.
- Add a refresh-token reuse/family strategy if you want a deeper security enhancement you can confidently explain.

## Submission reminder

Reply to the **existing HyScaler email thread**. Do not create a new email subject. Their email asks for PDF submission; put the public GitHub repository URL and Loom/demo URL in that PDF.
