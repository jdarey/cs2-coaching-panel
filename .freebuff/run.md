# How to run the CS2 Coaching Panel (dev)

## Reproduce the uncommitted artifacts

A fresh checkout needs these files, copied from the main checkout
(`C:\Users\Bartek\Desktop\last`):

- `.env.local` — contains `DATABASE_URL` (external PostgreSQL) and
  `NEXTAUTH_SECRET`. Copy it verbatim:
  `cp .env.local .env.local` from the main checkout (same directory here).
- `node_modules` — install dependencies: `npm install`.
- The Prisma client must match the schema: `npx prisma generate`
  (Prisma CLI reads env from a temporary `.env` copied from `.env.local`,
  because it does not read `.env.local` by default).
- The database schema is kept in sync with `prisma/schema.prisma` via
  `npx prisma db push` (no migration files are used).

## Run the server

```bash
PORT=3100 npm run dev
```

The dev server listens on `http://127.0.0.1:3100`. Keep the log at
`.freebuff/preview-5012fd8d-375b-4894-afdd-0d114eb4a8b6.log`.

Notes:
- NextAuth base URL is pinned to `http://localhost:${PORT}` in dev inside
  `src/lib/auth.ts` — no `NEXTAUTH_URL` needed locally.
- Demo accounts (seeded): `coach@test.com` / `student@test.com`,
  password `password123`.
