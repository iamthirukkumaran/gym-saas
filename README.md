# Astryx

**WhatsApp-first gym management SaaS.** Multi-tenant, India-first, built for independent gyms that still run on spreadsheets.

Astryx keeps every member, plan and expiry date in one place — then chases the renewal on WhatsApp automatically, before the membership lapses.

```
Gym owner dashboard  →  /login        (demo: owner@ironcore.in / gym1234)
Platform admin       →  /admin/login  (demo: admin@astryx.app / astryx123)
Public renewal page  →  /r/<memberId>
```

---

## Why this exists

A gym with 200 members at ₹1,500/month that recovers **8 lapsed members a month** recovers ₹12,000/month — about ₹1.4L a year. Most small gyms lose 30–50% of their members annually, and a large share of that is *involuntary*: the plan quietly expired and nobody chased it.

Astryx is built around that single loop:

```
add member → track expiry → auto-WhatsApp → renew → update status
```

Everything else in the product exists to serve that loop or to prove it is working.

---

## Quick start

Requires **Node 20+**. No database server, no accounts, no API keys.

```bash
npm install
cp .env.example .env          # then set AUTH_SECRET + CRON_SECRET
npm run db:reset              # creates SQLite db, pushes schema, seeds demo data
npm run dev                   # http://localhost:3000
```

`db:reset` seeds **4 gyms, 136 members, 255 memberships, 1,700 check-ins, 12 templates and 40 automations** — including members genuinely expiring this week, so every screen has real work to show.

To watch the automation engine run:

```bash
npm run engine                # one idempotent pass over every tenant
```

### Demo logins

| Role | Email | Password | Notes |
|---|---|---|---|
| Gym owner | `owner@ironcore.in` | `gym1234` | 64 members, Growth plan |
| Gym owner | `owner@pulsearena.in` | `gym1234` | 23 members, on trial |
| Gym owner | `owner@titanstrength.in` | `gym1234` | 38 members, Pro plan |
| Front desk | `desk@iron-core.in` | `gym1234` | restricted role |
| Platform superadmin | `admin@astryx.app` | `astryx123` | provisioning, billing |
| Platform support | `support@astryx.app` | `astryx123` | read-only |

---

## What's built

### Gym owner side

| Area | What it does |
|---|---|
| **Dashboard** | Active / expiring / expired counts, collections, dues, check-ins, renewal rate, at-risk members, and a preview of the next 7 days of WhatsApp sends |
| **Members** | Full records, URL-based filters, search, CSV import/export, derived status, duplicate-phone blocking |
| **Renewals** | A work queue ordered by urgency, with revenue-at-stake and one-tap WhatsApp |
| **Payments** | Part payments, modes, auto-numbered invoices, pending-dues worklist, collection rate |
| **Attendance** | Front-desk check-in by ID / phone / name, footfall chart, inactivity detection |
| **Enquiries** | Walk-in pipeline with follow-up dates and one-click conversion to member |
| **Automations** | 10 ready-made rules across 7 triggers, quiet hours, per-rule send times, dry-run preview, "run now" |
| **Templates** | 12 editable templates with a live WhatsApp preview and validated `{{variables}}` |
| **Message log** | Every message sent, queued, skipped or failed — with retry |
| **Reports** | Collections, renewal rate, plan mix, acquisition sources, month-by-month movement, LTV, trainer load |
| **Settings** | Gym profile, UPI ID, membership plans, staff roles, WhatsApp provider, subscription & usage |

### Platform (your) side

Overview with MRR/ARR and revenue-at-risk · tenant list and deep tenant detail with health flags · one-transaction gym provisioning · impersonation (banner + audited) · subscription plan catalogue · global template library with safe push-to-tenants · cross-tenant delivery monitoring · engine run history with a stale-scheduler alarm · append-only audit log.

---

## Architecture

```
app/
  page.tsx                  marketing landing
  login/  admin/login/      two separate auth surfaces
  app/                      gym tenant app        (requireStaff)
  admin/(console)/          platform admin        (requirePlatform)
  r/[id]/                   public renewal page   (no auth, noindex)
  api/cron/run/             the engine's scheduler endpoint
  api/export/               CSV exports
lib/
  engine.ts                 the reminder engine
  whatsapp/                 pluggable provider adapters
  members.ts                write path + read-model recompute
  provisioning.ts           tenant creation, in one transaction
  dashboard.ts platform.ts  aggregates
components/                 hook-free UI primitives + SVG charts
```

**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Prisma 7 · SQLite locally / Postgres in production · Zod · bcrypt · jose.

No chart library, no icon library, no component library, no state manager. Almost every page is server-rendered; client components exist only where there is genuine interactivity.

### Decisions worth knowing

**Money is integer paise.** Never floats. `lib/format.ts` is the only place rupees exist.

**Dates are calendar days at UTC midnight.** Expiry is a date, not an instant. Timezone conversion happens only when computing *the gym's* today or scheduling a send hour — so a 10 AM reminder for a Kolkata gym fires at 10 AM IST regardless of where the server lives.

**Status is derived, not stored.** `EXPIRING` is a function of today's date, so persisting it would mean a row that silently goes stale overnight. `lib/status.ts` exposes both the predicate and the matching Prisma `where` fragment, so the dashboard count and the filtered list can never disagree.

**The read model is denormalised.** `Member.expiryDate / totalPaid / balanceDue / lastCheckInAt` are maintained by `recomputeMember()` on every mutation. Dashboards read columns instead of aggregating per member.

**The engine is idempotent.** Safe to run every 15 minutes, twice at once, or three times after a crash. A `UNIQUE` dedupe key encoding *(gym, rule, member, occurrence-anchor)* guarantees one message per occurrence. When a member renews the anchor changes, so next cycle is free to send again.

**Queue-then-send, not send-inline.** An owner can see tomorrow's messages before they go out, and a provider outage leaves reminders `QUEUED` rather than losing them.

**Opt-outs and quiet hours are enforced in the engine**, not the UI, and skips are recorded as rows with a reason — so "why didn't Rahul get it?" has an answer.

**Auth is checked in layouts and every server action**, not in middleware. Middleware auth is advisory; `requireStaff()` re-reads the staff and gym row on every call, so a suspended gym or deactivated login loses access immediately rather than at cookie expiry.

**Every tenant-scoped query is filtered by `gymId` from the session**, never from form input.

---

## The WhatsApp layer

`lib/whatsapp/` is one interface with four implementations:

| Provider | Use |
|---|---|
| `sandbox` | **Default.** Runs the complete pipeline — scheduling, dedupe, retries, quiet hours, opt-outs, logging — and renders the exact message to the outbox without contacting Meta. Deterministically fails ~4% of sends so the retry path and failure UI are genuinely exercised. |
| `meta` | Meta WhatsApp Cloud API direct. Sends an approved template when one is registered, since business-initiated messages outside the 24-hour window require one. |
| `aisensy` / `wati` / `interakt` | Indian BSPs, built from one factory describing each vendor's endpoint, auth header and body shape. |

Switching provider is one setting in **Settings → WhatsApp**. Adding a BSP is about a dozen lines in `lib/whatsapp/bsp.ts`. The engine never knows which one is in use.

### Automation triggers

`BEFORE_EXPIRY` · `ON_EXPIRY` · `AFTER_EXPIRY` (win-back) · `WELCOME` · `BIRTHDAY` · `DUES_PENDING` · `INACTIVITY`

Every trigger matches on an **exact day**, not a range — a range would re-send on every run until the window closed.

`INACTIVITY` is the one competitors generally miss: a member who stops checking in is leaving weeks before their plan expires, and that is the cheapest churn to prevent.

---

## Scheduling the engine

Point any cron at the endpoint every 15 minutes:

```bash
curl -X POST https://your-host/api/cron/run \
     -H "Authorization: Bearer $CRON_SECRET"
```

`vercel.json` already declares this schedule. Without `CRON_SECRET` set the route refuses to run rather than defaulting open.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `start` | production |
| `npm run db:reset` | drop, push schema, reseed demo data |
| `npm run db:push` / `db:seed` / `db:studio` | individual Prisma steps |
| `npm run engine` | one engine pass from the CLI |
| `npm run use:postgres` / `use:sqlite` | switch the Prisma provider for deployment |

---

## Deploying

SQLite will not survive on serverless hosting, because each request gets an
ephemeral filesystem. Switching to Postgres is two commands:

```bash
npm run use:postgres
DATABASE_URL="postgresql://…" npx prisma db push
```

`lib/db.ts` picks the driver adapter from `DATABASE_URL` at runtime, so no
application code changes. `vercel.json` already registers the engine cron.
See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full walkthrough, including
going live on the WhatsApp Business API.

---

## Not built

Honest scope boundaries, in rough priority order if this goes further:

- **Real payment collection.** The renewal page builds a UPI intent link and the gym confirms manually. A Razorpay/Cashfree webhook that auto-extends the membership is the highest-value next feature.
- **Member-facing app**, biometric/QR hardware check-in, class scheduling, multi-branch, trainer payroll, GST invoice PDFs.
- **Delivery-status webhooks.** `DELIVERED`/`READ` are modelled but only the sandbox and seed data populate them; wiring Meta's status callback is straightforward.
- **Automated tests.** Verified here by a 48-check route/authorization smoke test, a cross-tenant isolation check and engine idempotency runs — not by a committed test suite.
