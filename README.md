# Business OS — Demo

A business management platform: double-entry accounting, invoicing, purchases, banking,
VAT reports, CRM (leads, deals, contacts, tasks), meetings, expenses and a full activity audit log.

This repository is a **client demo**. Every company, person, figure and contact in it is
**fictional sample data** ("Meridian Trading LLC").

**Stack:** Node.js + Express API · vanilla-JS frontend · Postgres (Neon) · hosted on Vercel.

---

## Demo logins (password `Demo@2026`)

| Name         | Role                 | Email              |
|--------------|----------------------|--------------------|
| Alex Morgan  | Managing Director (super admin) | admin@demo.com |
| Sara Khan    | Sales Director (admin)          | sara@demo.com  |
| Daniel Reyes | Operations Manager (admin)      | daniel@demo.com |
| Priya Nair   | Finance & Accounts (accountant) | accounts@demo.com |

Set `DEMO_PASSWORD` before the first deploy to use a different password.

## What's pre-loaded

8 meetings · 14 expenses · 15 leads · 5 customers & 3 vendors · 5 items · 8 invoices
(paid / sent / partially paid / draft) · 5 bills · payments · 5 deals · 4 tasks · 2 projects with
timesheets · chart of accounts with balanced journals, so P&L, Balance Sheet, Trial Balance,
A/R & A/P aging and VAT reports are all populated.

---

## Deploy: GitHub → Neon → Vercel

### 1. Push to a new GitHub repository
```bash
cd business-os-demo
git init && git add . && git commit -m "Business OS demo"
git branch -M main
git remote add origin https://github.com/<your-org>/<new-demo-repo>.git
git push -u origin main
```
Make the repository **private**.

### 2. Create the Neon database
1. Go to **neon.com** → **New project** (choose the region closest to your Vercel region, for example AWS Frankfurt or Mumbai).
2. Open **Connect** → turn **Connection pooling ON** → copy the connection string.
   It looks like `postgresql://user:pass@ep-xxxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require`
   (the `-pooler` part matters for serverless).

### 3. Deploy on Vercel
1. **vercel.com → Add New → Project** → import the new GitHub repo.
2. Framework preset: **Other**. Leave build and output settings as they are (`vercel.json` handles them).
3. **Environment Variables:**
   - `DATABASE_URL` = the Neon pooled connection string
   - `JWT_SECRET` = a long random string (e.g. `openssl rand -hex 32`)
   - `NODE_ENV` = `production`
4. Click **Deploy**. On the first request the app creates all tables and loads the demo data into Neon.
   This first request takes a few seconds; after that it's fast.
5. Open the `*.vercel.app` URL and sign in with `admin@demo.com` / `Demo@2026`.

Optional: add a custom domain under **Project → Settings → Domains**.

### Resetting the demo data
To wipe everything and reload the original sample data (for example after a client session):
```bash
npm install
DATABASE_URL="<neon url>" npm run reset
```

---

## Run locally
```bash
npm install
export DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
npm start            # http://localhost:3000
```

## How hosting works
- `public/` is served as static files by Vercel's CDN.
- `api/index.js` exposes the Express app as a single serverless function. `vercel.json` routes
  `/api/*` and `/uploads/*` to it.
- File uploads (receipts, documents) are stored **in Postgres**, because Vercel's disk is not
  persistent. Max file size is 4 MB per upload.
- The database schema and seed run once per cold start and only seed an empty database.

## Project structure
```
api/index.js            Vercel serverless entry
server/                 Express API, Postgres data layer, accounting engine, seed data
public/                 Frontend (HTML, CSS, JS, assets)
vercel.json             Vercel config
.env.example            Environment variables
```
