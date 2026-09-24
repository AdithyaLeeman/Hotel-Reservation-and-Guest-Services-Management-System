# docs/15 — Local Setup

## Prerequisites
- Node.js 20+ (LTS)
- npm 10+
- PostgreSQL 15+

## Install

```bash
git clone <repo-url>
cd Hotel-Reservation-and-Guest-Services-Management-System
npm install
```

## Environment

```bash
cp .env.example .env.local
# Edit .env.local with your local PostgreSQL connection string and a random SESSION_SECRET
```

## Create the Database

```sql
-- In psql or your PostgreSQL client:
CREATE DATABASE hrgsms;
```

## Run Migrations

```bash
npm run migrate
# Applies all SQL files in database/migrations/ in manifest order
```

## Seed Data

```bash
npm run seed
# Applies all SQL files in database/seeds/ in order
```

## Run the App

```bash
npm run dev
# Opens at http://localhost:3000
```

## Run Tests

```bash
npm test
# Runs all tests
```

## Reset the Database

```bash
npm run db:reset
# Drops and recreates the database, then runs migrate + seed
```

## Troubleshooting

| Problem | Solution |
|---|---|
| `ECONNREFUSED` on DB connect | Check PostgreSQL is running and DATABASE_URL is correct |
| `pg` auth error | Check DB username/password in `.env.local` |
| Migration out of order | Check `database/migrations/manifest.md` for correct order |
| Session errors | Ensure `SESSION_SECRET` is at least 32 characters |
| Port already in use | `kill $(lsof -t -i:3000)` or change port in `package.json` |
