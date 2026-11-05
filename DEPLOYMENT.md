# Deploying Astryx

Local development uses SQLite. **Production needs Postgres** — serverless platforms give each request an ephemeral filesystem, so a SQLite file would be wiped and would not be shared between instances.

The switch is two changes. No application code is touched: `lib/db.ts` already picks the right Prisma driver adapter from the shape of `DATABASE_URL`.

---

## 1. Create a Postgres database

Any managed Postgres works. [Neon](https://neon.tech) and [Supabase](https://supabase.com) both have usable free tiers.

Copy the connection string. It looks like:

```
postgresql://user:password@host/dbname?sslmode=require
```

> **Supabase:** use the **connection pooler** string (port `6543`) for the app, and the direct string (port `5432`) for running migrations.

## 2. Change the Prisma provider

In `prisma/schema.prisma`:

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
 }
```

The schema deliberately avoids every Postgres-incompatible feature, so nothing else changes.

## 3. Push the schema

```bash
DATABASE_URL="postgresql://…" npx prisma db push
```

For a long-lived deployment prefer real migrations:

```bash
DATABASE_URL="postgresql://…" npx prisma migrate dev --name init
```

## 4. Seed the catalogue

The seed script creates the platform admin, subscription plans, the template library **and** four demo gyms.

```bash
DATABASE_URL="postgresql://…" npm run db:seed
```

For a real production database you almost certainly want only the first three. Open `prisma/seed.ts` and stop after the "Creating the global template library" step, or delete the demo gyms afterwards from **Admin → Gyms**.

**Change both demo passwords immediately** — they are in the README.

---

## 5. Deploy to Vercel

```bash
npm i -g vercel
vercel link
vercel env add DATABASE_URL production      # the Postgres URL
vercel env add AUTH_SECRET production       # openssl rand -base64 48
vercel env add CRON_SECRET production       # openssl rand -hex 24
vercel env add APP_URL production           # https://your-domain.vercel.app
vercel env add WHATSAPP_PROVIDER production # sandbox, until Meta approves you
vercel --prod
```

`vercel.json` already registers the engine cron:

```json
{ "crons": [{ "path": "/api/cron/run", "schedule": "*/15 * * * *" }] }
```

Vercel Cron calls it without a bearer header, so also set the secret as a query parameter in the cron path, or use Vercel's own `CRON_SECRET` convention. The simplest reliable approach:

```json
{ "crons": [{ "path": "/api/cron/run?secret=YOUR_CRON_SECRET", "schedule": "*/15 * * * *" }] }
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `AUTH_SECRET` | yes | 32+ random chars; signs session JWTs. Rotating it logs everyone out. |
| `CRON_SECRET` | yes | Without it, `/api/cron/run` refuses to run |
| `APP_URL` | yes | Public base URL; builds the `{{renew_link}}` in every message |
| `WHATSAPP_PROVIDER` | no | `sandbox` (default) \| `meta` \| `aisensy` \| `wati` \| `interakt` |
| `META_WA_*` | no | Fallbacks when a gym has no per-tenant Meta credentials |
| `BSP_API_KEY`, `BSP_BASE_URL` | no | Fallbacks for an Indian BSP |

Per-gym WhatsApp credentials entered in **Settings → WhatsApp** always take precedence over these.

---

## 6. Verify the deployment

```bash
# engine endpoint is protected
curl -X POST https://your-host/api/cron/run                       # expect 401
curl -X POST https://your-host/api/cron/run \
     -H "Authorization: Bearer $CRON_SECRET"                      # expect 200 + JSON
```

Then in the product:

1. Sign in at `/admin/login` → **Engine runs**. Confirm a run appears within 15 minutes. The page raises a **"scheduler may not be running"** alarm if the last run is over an hour old.
2. Provision a gym at **Admin → Gyms → Provision a gym**.
3. Sign in as that owner, import a few members with expiry dates, then **Automations → Run automations now**.
4. Check **Message log** — in sandbox mode you should see fully rendered messages marked `SENT`.

---

## Going live on WhatsApp

Astryx runs fully on the **sandbox** provider: every automation fires, every message is rendered and logged, nothing is delivered. That is deliberate — Meta approval takes days, and you should not be blocked on it to onboard customers and get their data correct.

To deliver for real:

1. Create a Meta Business account and verify the business.
2. Add a phone number not already registered on WhatsApp.
3. Submit templates for approval. Copy the wording straight from the gym's **Templates** page — the `{{variables}}` map to Meta's positional `{{1}}`, `{{2}}` parameters.
4. Create a System User and generate a **permanent** access token.
5. In **Settings → WhatsApp**, paste the phone number ID and token, switch the provider to **Meta**, and press **Send test message**.
6. Once the test arrives, the gym is live. Nothing else changes.

Alternatively use an Indian BSP (AiSensy, Wati, Interakt) — faster onboarding, slightly higher per-message cost, and only an API key to paste.

---

## Operational notes

**Backups.** Member and payment records are a gym's business. Enable your provider's automated backups on day one; `/api/export/members` and `/api/export/payments` give every owner a self-service CSV, which also answers the "can I get my data out?" sales objection.

**Scaling the engine.** `dispatchQueue` handles 200 messages per run to stop one large tenant starving the rest. At a few hundred tenants, run the cron more often or shard by passing `?gymId=` per tenant.

**Rate limits.** Watch **Admin → Message delivery**. Meta rate-limits per phone number, and quality rating drops if members block the number — which is exactly why quiet hours and opt-outs are enforced in the engine rather than left to the UI.

**Rotating `AUTH_SECRET`** invalidates every session; all users simply sign in again.
