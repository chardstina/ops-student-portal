# Internal Operations & Student Management Portal

A centralized platform for a training institution to manage students, payments, courses, enquiries, records, and expenses.

## Stack

- **Frontend:** React 18 (Vite), React Router, TailwindCSS, TanStack Query, React Hook Form + Zod, Recharts
- **Backend:** Node.js + Express (TypeScript), PostgreSQL via Prisma, JWT auth (access + refresh), RBAC
- **Integrations:** Stripe (payments + webhooks), Nodemailer (email), Twilio SMS (stubbed), node-cron (reminders + birthdays), Multer (uploads), PDFKit (receipts)
- **Monorepo:** `/client` + `/server`, `docker-compose.yml`, seed script, OpenAPI/Swagger docs

## Roles

`ADMIN`, `OPERATIONS`, `FINANCE`, `STUDENT`. RBAC is enforced on both API routes and the UI. Students only see their own dashboard.

## Quick start (Docker)

```bash
cp .env.example .env        # adjust secrets if desired
docker compose up --build
```

- Client: http://localhost:5173
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs

The server container runs `prisma migrate deploy`, seeds, then starts.

## Local development (without Docker)

Requires Node 20+ and a running PostgreSQL.

```bash
# 1. Install
npm install            # root (workspaces install client + server)

# 2. Configure
cp .env.example .env
cp .env.example server/.env       # server reads its own .env
# set DATABASE_URL to your Postgres instance

# 3. Database
cd server
npx prisma migrate dev --name init   # creates tables (or: prisma db push)
npm run seed
cd ..

# 4. Run both apps
npm run dev            # server on :4000, client on :5173
```

Create the client env so Vite points at the API:

```bash
echo "VITE_API_URL=http://localhost:4000/api" > client/.env
```

## Seed logins

Password for all: `Password123!`

| Email | Role |
|-------|------|
| admin@institute.test | ADMIN |
| ops@institute.test | OPERATIONS |
| finance@institute.test | FINANCE |
| jane@student.test | STUDENT |

## Key business rules

- **Auto Student ID** — format `{COURSE_CODE}-{YYYYMM}-{SEQ}` (e.g. `WD-202606-0042`). Generated server-side, unique, and never editable via API or UI.
- **Duplicate prevention** — enforced in the create route (email OR phone) and by DB `@unique` constraints.
- **Automated messaging** — birthdays, payment reminders (2 weeks / 1 week / due date), and enquiry follow-ups are all sent by a daily cron job (08:00). No manual trigger required. Admins can manually invoke jobs via `/api/notifications/run/*` for testing.
- **Pricing edits** restricted to `ADMIN` and `FINANCE`.

## Environment variables

See `.env.example`. Notable ones:

- `DATABASE_URL` — Postgres connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — leave blank to disable online payments
- `SMTP_*` — leave `SMTP_HOST` blank to log emails to console instead of sending
- `SMS_ENABLED=false` — SMS is stubbed (logs to console); plug in Twilio in `server/src/services/sms.ts`
- `ENABLE_CRON=true`

## Stripe webhook

Point Stripe at `POST /api/webhooks/stripe`. The route uses the raw body and is mounted before the JSON parser. Local testing:

```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

## Tests

```bash
cd server && npm test
```

Covers Student ID generation, duplicate-prevention predicate, and reminder-scheduling logic (2-week / 1-week / due-date milestones + birthday matching).

## API surface

Full list at `/api/docs`. Modules: auth, students, courses, payments, enquiries, expenses, notifications.

## Project structure

```
.
├── client/                 React + Vite frontend
│   └── src/
│       ├── components/      Layout, UI primitives, StudentDashboardView
│       ├── lib/             api client, auth context
│       └── pages/           Login, dashboards, CRUD screens
├── server/
│   ├── prisma/             schema.prisma + seed.ts
│   └── src/
│       ├── middleware/      auth (JWT + RBAC), error handling
│       ├── services/        mailer, sms, notify, receipt (PDF), upload
│       ├── cron/            jobs + pure reminder logic + scheduler
│       └── modules/         auth, students, courses, payments, enquiries, expenses, notifications
└── docker-compose.yml
```
