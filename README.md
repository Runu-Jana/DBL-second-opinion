# DBL International — Oncology Second Opinion

Full-stack web app for an oncology second-opinion service.

- **Frontend:** React 18 + Vite + React Router (`client/`)
- **Backend:** Node.js + Express (`server/`)
- **Database:** PostgreSQL via Prisma ORM (`prisma/`)
- **Features:** public site, "Our Oncologists" + doctor detail pages, "Our Services"
  + service detail pages, a patient upload portal, and an admin panel (`/admin`)
  to manage oncologists and services (with photo uploads).

In production, Express serves the built React app (`client/dist`) **and** the JSON
API from a single service.

---

## Local development

### Prerequisites
- Node.js 18+
- A PostgreSQL database. The simplest option is Docker (below); any Postgres works.

### 1. Start PostgreSQL
```bash
docker compose up -d          # runs Postgres on host port 55432
```
(Or point `DATABASE_URL` at your own Postgres instead.)

### 2. Configure environment
```bash
cp .env.example .env          # then edit values as needed
```

### 3. Install, migrate, seed
```bash
npm install                   # backend deps
npm run db:push               # create tables
npm run seed                  # sample oncologists + services + admin (idempotent)
```

### 4. Run
Two options:

**A. Production-style (one server):**
```bash
npm run build                 # builds the React app into client/dist
npm start                     # http://localhost:5177  (API + site)
```

**B. Hot-reload frontend (two terminals):**
```bash
npm start                     # API on :5177
npm run client:dev            # Vite on :5173 (proxies /api and /uploads)
```

### Admin panel
`/admin` — default login `admin@dblhealthcare.com` / `admin123` (change in `.env`).

---

## Deployment

The app deploys as **one web service + one Postgres database**.

- **Build command:** `npm install && npm run build`
- **Release/pre-deploy:** `npm run release`  (runs `prisma db push` + idempotent seed)
- **Start command:** `npm start`
- **Required env vars:** `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`,
  `ADMIN_PASSWORD`, `ADMIN_NAME`

### Railway
1. Push this repo to GitHub.
2. Railway → **New Project** → **Deploy from GitHub repo**. `railway.json` supplies the
   build and start commands; a `Procfile` is included for Heroku-style hosts too.
3. Add a **PostgreSQL** service and set `DATABASE_URL` to `${{Postgres.DATABASE_URL}}`.
4. Set the env vars above. `JWT_SECRET` is mandatory — the server refuses to boot in
   production without one, rather than fall back to a guessable default.

`npm start` runs the release step before booting, so the schema is pushed and seeded
wherever the app starts. Build containers cannot reach the private network on Railway,
which is why that work happens at start rather than during the build.

---

## Tests

`tests/api/` holds the regression suites. Each one drives the real HTTP API against the real
database as every role in turn, creates the rows it needs and deletes them afterwards. They
expect a server on port 5500 started with the secret the suites mint their tokens with, and
with the per-IP throttles off (a full run makes more upload and login calls than the limits
allow in a quarter of an hour; the switch is ignored in production):

```bash
docker compose up -d && npm run db:push && npm run seed   # once
PORT=5500 JWT_SECRET=t RATE_LIMIT=off node server/server.js   # terminal 1
npm test                                                      # terminal 2  (or: npm test -- questions)
```

`npm test` runs every suite in turn, prints one line per suite and a total, and exits non-zero
if any check fails. The suites write rows, so never point them at a production database.

---

## Notes
- **Uploads:** doctor photos are stored on local disk (`uploads/`). On ephemeral
  hosts (e.g. serverless), switch to object storage (S3/Cloudinary) for persistence.
- **Security:** this is a reference build. Before handling real patient data, use
  strong secrets, HTTPS, and the appropriate medical-data compliance for your region.
- **Seeding is idempotent** — it only inserts sample data when the tables are empty,
  so re-deploys never overwrite admin edits.
