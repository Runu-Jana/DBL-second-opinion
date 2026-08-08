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
`/admin` — default login `admin@dblindia.com` / `admin123` (change in `.env`).

---

## Deployment

The app deploys as **one web service + one Postgres database**.

- **Build command:** `npm install && npm run build`
- **Release/pre-deploy:** `npm run release`  (runs `prisma db push` + idempotent seed)
- **Start command:** `npm start`
- **Required env vars:** `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`,
  `ADMIN_PASSWORD`, `ADMIN_NAME`

### Render (blueprint included)
1. Push this repo to GitHub.
2. Render → **New +** → **Blueprint** → select the repo. `render.yaml` provisions
   the web service and a managed Postgres, and wires `DATABASE_URL` automatically.
3. Set a strong `ADMIN_PASSWORD` in the dashboard; `JWT_SECRET` is auto-generated.

### Railway / Heroku-style
A `Procfile` is included (`release:` runs migrations + seed, `web:` starts the app).
Add a Postgres plugin and set the env vars above.

---

## Notes
- **Uploads:** doctor photos are stored on local disk (`uploads/`). On ephemeral
  hosts (e.g. serverless), switch to object storage (S3/Cloudinary) for persistence.
- **Security:** this is a reference build. Before handling real patient data, use
  strong secrets, HTTPS, and the appropriate medical-data compliance for your region.
- **Seeding is idempotent** — it only inserts sample data when the tables are empty,
  so re-deploys never overwrite admin edits.
