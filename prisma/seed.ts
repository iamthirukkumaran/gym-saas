/**
 * Seeds Astryx with a believable working dataset.
 *
 * The goal is not "some rows exist" — it's that every screen has something
 * true to show: members genuinely expiring this week, real dues, a messy
 * tail of lapsed members to win back, and message history. A dashboard that
 * demos well on fake data is how you find the UI gaps before a customer does.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";

import { DEFAULT_MEMBERSHIP_PLANS, DEFAULT_SAAS_PLANS, DEFAULT_TEMPLATES } from "../lib/defaults";

try {
  process.loadEnvFile(".env");
} catch {
  // In production the environment is supplied by the host, not a .env file.
}

/**
 * Seed mode.
 *
 *   npm run db:seed                 → everything, including 4 demo gyms (local)
 *   SEED_MODE=platform npm run db:seed → platform only, no demo tenants
 *
 * Use `platform` for a real deployment: it creates the Astryx admin logins,
 * the subscription plans and the WhatsApp template library, and stops there.
 * Real gyms are then provisioned from the admin console.
 */
const PLATFORM_ONLY =
  process.env.SEED_MODE === "platform" || process.argv.includes("--platform-only");

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const TZ = "Asia/Kolkata";

// ── Deterministic pseudo-randomness, so every reseed looks identical ───────
let seedState = 20261105;
function rnd(): number {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
  return seedState / 0x7fffffff;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}
function int(min: number, max: number): number {
  return Math.floor(rnd() * (max - min + 1)) + min;
}

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDays(d: Date, n: number): Date {
  const x = utcDay(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

const TODAY = utcDay(new Date());

const FIRST_NAMES = [
  "Rahul", "Priya", "Arjun", "Sneha", "Vikram", "Ananya", "Karthik", "Divya",
  "Imran", "Meera", "Suresh", "Kavya", "Aditya", "Pooja", "Rohan", "Nisha",
  "Manoj", "Shreya", "Ajay", "Lakshmi", "Faisal", "Ritu", "Nikhil", "Swati",
  "Harish", "Deepa", "Varun", "Anjali", "Sandeep", "Neha", "Yusuf", "Tanya",
  "Gaurav", "Preeti", "Akash", "Bhavna", "Ramesh", "Sunita", "Vijay", "Madhuri",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Singh", "Gupta",
  "Khan", "Joshi", "Menon", "Rao", "Desai", "Kulkarni", "Pillai", "Shetty",
  "Bose", "Chauhan", "Malhotra", "Fernandes",
];
const GOALS = [
  "Weight loss", "Muscle gain", "General fitness", "Strength training",
  "Marathon prep", "Post-injury recovery", "Cricket conditioning",
];

function phoneFor(i: number): string {
  // Deterministic, clearly-fake-but-valid Indian mobile numbers.
  return `+9178${String(10_00000 + i * 37).slice(0, 8)}`.slice(0, 13);
}

/**
 * Creates the platform admin logins, subscription plans and template library.
 * Idempotent: safe to re-run against a live database.
 */
async function seedPlatform() {
  const admins = [
    { name: "Astryx Admin", email: "admin@astryx.app", role: "SUPERADMIN" },
    { name: "Astryx Support", email: "support@astryx.app", role: "SUPPORT" },
  ];
  const tempPassword = process.env.ADMIN_PASSWORD ?? "astryx123";
  const passwordHash = await hash(tempPassword, 12);

  for (const a of admins) {
    const existing = await db.platformUser.findUnique({ where: { email: a.email } });
    if (existing) {
      console.log(`   = platform user ${a.email} already exists, left unchanged`);
      continue;
    }
    await db.platformUser.create({ data: { ...a, passwordHash } });
    console.log(`   + platform user ${a.email}`);
  }

  for (const p of DEFAULT_SAAS_PLANS) {
    await db.saasPlan.upsert({
      where: { key: p.key },
      update: {},
      create: {
        key: p.key,
        name: p.name,
        tagline: p.tagline,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        memberLimit: p.memberLimit,
        staffLimit: p.staffLimit,
        waMessageLimit: p.waMessageLimit,
        featuresJson: JSON.stringify(p.features),
        sortOrder: p.sortOrder,
        isDefault: p.isDefault,
      },
    });
  }
  console.log(`   + ${DEFAULT_SAAS_PLANS.length} subscription plans ensured`);

  for (const t of DEFAULT_TEMPLATES) {
    await db.systemTemplate.upsert({
      where: { key: t.key },
      update: {},
      create: {
        key: t.key,
        name: t.name,
        category: t.category,
        body: t.body,
        description: t.description,
        defaultRule: t.defaultRule,
        defaultOffset: t.defaultOffset ?? 0,
        trigger: t.trigger ?? null,
        sortOrder: t.sortOrder,
      },
    });
  }
  console.log(`   + ${DEFAULT_TEMPLATES.length} library templates ensured`);

  console.log(`
✅ Platform ready.

   Sign in at /admin/login
     admin@astryx.app   / ${tempPassword}
     support@astryx.app / ${tempPassword}

   ⚠ Change both passwords immediately, then provision your first gym
     from Admin → Gyms → Provision a gym.
`);
}

async function main() {
  if (PLATFORM_ONLY) {
    // Never wipe a production database. Only the platform catalogue is
    // touched, and only where it is missing.
    console.log("→ Platform-only seed: existing tenant data will NOT be touched.");
    await seedPlatform();
    return;
  }

  console.log("→ Clearing existing data…");
  // Order matters: children before parents.
  await db.messageLog.deleteMany();
  await db.broadcast.deleteMany();
  await db.reminderRule.deleteMany();
  await db.waTemplate.deleteMany();
  await db.checkIn.deleteMany();
  await db.payment.deleteMany();
  await db.membership.deleteMany();
  await db.lead.deleteMany();
  await db.member.deleteMany();
  await db.membershipPlan.deleteMany();
  await db.trainer.deleteMany();
  await db.staffUser.deleteMany();
  await db.saasInvoice.deleteMany();
  await db.subscription.deleteMany();
  await db.auditLog.deleteMany();
  await db.engineRun.deleteMany();
  await db.gym.deleteMany();
  await db.saasPlan.deleteMany();
  await db.systemTemplate.deleteMany();
  await db.platformUser.deleteMany();

  // ── Platform staff ──────────────────────────────────────────────────────
  console.log("→ Creating Astryx platform users…");
  await db.platformUser.create({
    data: {
      name: "Astryx Admin",
      email: "admin@astryx.app",
      passwordHash: await hash("astryx123", 12),
      role: "SUPERADMIN",
    },
  });
  await db.platformUser.create({
    data: {
      name: "Astryx Support",
      email: "support@astryx.app",
      passwordHash: await hash("astryx123", 12),
      role: "SUPPORT",
    },
  });

  // ── Catalogue ───────────────────────────────────────────────────────────
  console.log("→ Creating subscription plans…");
  const plans: Record<string, { id: string; waMessageLimit: number }> = {};
  for (const p of DEFAULT_SAAS_PLANS) {
    const created = await db.saasPlan.create({
      data: {
        key: p.key,
        name: p.name,
        tagline: p.tagline,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        memberLimit: p.memberLimit,
        staffLimit: p.staffLimit,
        waMessageLimit: p.waMessageLimit,
        featuresJson: JSON.stringify(p.features),
        sortOrder: p.sortOrder,
        isDefault: p.isDefault,
      },
    });
    plans[p.key] = { id: created.id, waMessageLimit: created.waMessageLimit };
  }

  console.log("→ Creating the global template library…");
  for (const t of DEFAULT_TEMPLATES) {
    await db.systemTemplate.create({
      data: {
        key: t.key,
        name: t.name,
        category: t.category,
        body: t.body,
        description: t.description,
        defaultRule: t.defaultRule,
        defaultOffset: t.defaultOffset ?? 0,
        trigger: t.trigger ?? null,
        sortOrder: t.sortOrder,
      },
    });
  }

  // ── Tenants ─────────────────────────────────────────────────────────────
  const gymSpecs = [
    {
      slug: "iron-core",
      name: "Iron Core Fitness",
      ownerName: "Suresh Kumar",
      email: "owner@ironcore.in",
      phone: "+919812345670",
      city: "Coimbatore",
      state: "Tamil Nadu",
      planKey: "growth",
      status: "ACTIVE",
      upiId: "ironcore@okaxis",
      memberCount: 64,
      monthsOfHistory: 9,
      full: true,
    },
    {
      slug: "pulse-arena",
      name: "Pulse Arena Gym",
      ownerName: "Anita Deshpande",
      email: "owner@pulsearena.in",
      phone: "+919812345671",
      city: "Pune",
      state: "Maharashtra",
      planKey: "starter",
      status: "TRIAL",
      upiId: "pulsearena@okhdfcbank",
      memberCount: 23,
      monthsOfHistory: 3,
      full: true,
    },
    {
      slug: "titan-strength",
      name: "Titan Strength Club",
      ownerName: "Mohammed Faisal",
      email: "owner@titanstrength.in",
      phone: "+919812345672",
      city: "Hyderabad",
      state: "Telangana",
      planKey: "pro",
      status: "ACTIVE",
      upiId: "titanstrength@oksbi",
      memberCount: 38,
      monthsOfHistory: 6,
      full: true,
    },
    {
      slug: "flexfit-studio",
      name: "FlexFit Studio",
      ownerName: "Rakesh Menon",
      email: "owner@flexfit.in",
      phone: "+919812345673",
      city: "Kochi",
      state: "Kerala",
      planKey: "starter",
      status: "PAST_DUE",
      upiId: "flexfit@okicici",
      memberCount: 11,
      monthsOfHistory: 2,
      full: false,
    },
  ];

  const ownerHash = await hash("gym1234", 12);
  let nameCursor = 0;

  for (const spec of gymSpecs) {
    console.log(`→ Provisioning ${spec.name} (${spec.memberCount} members)…`);
    const plan = plans[spec.planKey];

    const gym = await db.gym.create({
      data: {
        slug: spec.slug,
        name: spec.name,
        ownerName: spec.ownerName,
        email: spec.email,
        phone: spec.phone,
        addressLine: `${int(1, 99)} Main Road`,
        city: spec.city,
        state: spec.state,
        pincode: String(int(400000, 699999)),
        timezone: TZ,
        status: spec.status,
        upiId: spec.upiId,
        trialEndsAt: spec.status === "TRIAL" ? addDays(TODAY, 9) : null,
        saasPlanId: plan.id,
        waProvider: "sandbox",
        waConnected: true,
        waSenderDisplay: spec.name,
        autoRemindersEnabled: true,
        reminderSendHour: 10,
        createdAt: addDays(TODAY, -spec.monthsOfHistory * 30),
      },
    });

    // Owner + staff logins
    await db.staffUser.create({
      data: {
        gymId: gym.id,
        name: spec.ownerName,
        email: spec.email,
        passwordHash: ownerHash,
        phone: spec.phone,
        role: "OWNER",
      },
    });
    if (spec.full) {
      await db.staffUser.create({
        data: {
          gymId: gym.id,
          name: "Front Desk",
          email: `desk@${spec.slug}.in`,
          passwordHash: ownerHash,
          role: "FRONTDESK",
        },
      });
    }

    // Trainers
    const trainerIds: string[] = [];
    if (spec.full) {
      for (const tName of ["Coach Imran", "Coach Divya", "Coach Arun"]) {
        const t = await db.trainer.create({
          data: {
            gymId: gym.id,
            name: tName,
            phone: phoneFor(nameCursor++),
            specialty: pick(["Strength", "Functional", "Cardio & HIIT", "Rehab"]),
          },
        });
        trainerIds.push(t.id);
      }
    }

    // Membership plans
    const planRows = [];
    for (const p of DEFAULT_MEMBERSHIP_PLANS) {
      planRows.push(
        await db.membershipPlan.create({
          data: {
            gymId: gym.id,
            name: p.name,
            durationDays: p.durationDays,
            price: p.price,
            joiningFee: p.joiningFee,
            description: p.description,
            sortOrder: p.sortOrder,
          },
        }),
      );
    }

    // Templates + automations
    for (const t of DEFAULT_TEMPLATES) {
      await db.waTemplate.create({
        data: {
          gymId: gym.id,
          key: t.key,
          name: t.name,
          category: t.category,
          body: t.body,
          isSystem: true,
        },
      });
    }
    for (const t of DEFAULT_TEMPLATES.filter((x) => x.defaultRule && x.trigger)) {
      await db.reminderRule.create({
        data: {
          gymId: gym.id,
          name: t.name,
          trigger: t.trigger!,
          offsetDays: t.defaultOffset ?? 0,
          templateKey: t.key,
          enabled: true,
        },
      });
    }

    // Subscription + platform invoices
    const saasPlanRow = await db.saasPlan.findUniqueOrThrow({ where: { key: spec.planKey } });
    const sub = await db.subscription.create({
      data: {
        gymId: gym.id,
        planId: saasPlanRow.id,
        status:
          spec.status === "TRIAL" ? "TRIALING" : spec.status === "PAST_DUE" ? "PAST_DUE" : "ACTIVE",
        billingCycle: "MONTHLY",
        amount: saasPlanRow.priceMonthly,
        currentPeriodStart: addDays(TODAY, -15),
        currentPeriodEnd: addDays(TODAY, 15),
      },
    });

    for (let m = spec.monthsOfHistory; m >= 1; m--) {
      const issued = addDays(TODAY, -m * 30);
      const isLast = m === 1;
      await db.saasInvoice.create({
        data: {
          gymId: gym.id,
          subscriptionId: sub.id,
          number: `AX-${gym.slug.toUpperCase().slice(0, 4)}-${String(spec.monthsOfHistory - m + 1).padStart(4, "0")}`,
          amount: saasPlanRow.priceMonthly,
          tax: Math.round(saasPlanRow.priceMonthly * 0.18),
          total: Math.round(saasPlanRow.priceMonthly * 1.18),
          status: isLast && spec.status === "PAST_DUE" ? "OVERDUE" : "PAID",
          issuedAt: issued,
          dueAt: addDays(issued, 7),
          paidAt: isLast && spec.status === "PAST_DUE" ? null : addDays(issued, int(0, 5)),
          method: pick(["UPI", "CARD", "BANK"]),
        },
      });
    }

    // ── Members ───────────────────────────────────────────────────────────
    // Expiry distribution is engineered so the dashboard has real work to
    // show: a visible renewal queue this week, fresh lapses to win back,
    // and a long tail of dormant members.
    const buckets: { offset: number; weight: number }[] = [
      { offset: 1, weight: 2 },   // expires tomorrow
      { offset: 3, weight: 3 },   // expires in 3 days
      { offset: 7, weight: 3 },   // expires in a week
      { offset: 0, weight: 1 },   // expires today
      { offset: 14, weight: 4 },
      { offset: 30, weight: 6 },
      { offset: 60, weight: 5 },
      { offset: 120, weight: 4 },
      { offset: -3, weight: 3 },  // just lapsed
      { offset: -10, weight: 2 },
      { offset: -25, weight: 2 },
      { offset: -70, weight: 2 },
    ];
    const weighted: number[] = [];
    for (const b of buckets) for (let i = 0; i < b.weight; i++) weighted.push(b.offset);

    for (let i = 0; i < spec.memberCount; i++) {
      const first = FIRST_NAMES[nameCursor % FIRST_NAMES.length];
      const last = LAST_NAMES[(nameCursor * 7) % LAST_NAMES.length];
      nameCursor++;
      const name = `${first} ${last}`;

      const planRow = planRows[Math.min(int(0, planRows.length - 1), planRows.length - 1)];
      const expiryOffset = weighted[i % weighted.length];
      const endDate = addDays(TODAY, expiryOffset);
      const startDate = addDays(endDate, -(planRow.durationDays - 1));
      const joinDate = rnd() < 0.35 ? startDate : addDays(startDate, -int(30, 300));

      const isExpired = expiryOffset < 0;
      const frozen = !isExpired && rnd() < 0.04;

      const code = `MBR-${String(i + 1).padStart(4, "0")}`;
      const member = await db.member.create({
        data: {
          gymId: gym.id,
          code,
          name,
          phone: phoneFor(nameCursor + i * 3),
          email: rnd() < 0.5 ? `${first.toLowerCase()}.${last.toLowerCase()}@example.com` : null,
          gender: rnd() < 0.62 ? "MALE" : "FEMALE",
          // A slice of members have a birthday today, so the birthday
          // automation has something to do on a fresh install.
          dob:
            i % 17 === 0
              ? new Date(Date.UTC(1995 + (i % 10), TODAY.getUTCMonth(), TODAY.getUTCDate()))
              : rnd() < 0.7
                ? new Date(Date.UTC(int(1978, 2006), int(0, 11), int(1, 28)))
                : null,
          city: spec.city,
          joinDate,
          status: frozen ? "FROZEN" : isExpired ? "EXPIRED" : "ACTIVE",
          heightCm: rnd() < 0.6 ? int(150, 190) : null,
          weightKg: rnd() < 0.6 ? int(48, 110) : null,
          goal: rnd() < 0.7 ? pick(GOALS) : null,
          emergencyName: rnd() < 0.4 ? `${pick(FIRST_NAMES)} ${last}` : null,
          emergencyPhone: rnd() < 0.4 ? phoneFor(nameCursor + 500 + i) : null,
          trainerId: trainerIds.length && rnd() < 0.45 ? pick(trainerIds) : null,
          source: pick(["WALKIN", "REFERRAL", "INSTAGRAM", "GOOGLE", "PHONE"]),
          waOptOut: rnd() < 0.03,
          createdAt: joinDate,
        },
      });

      // Membership history: the current window, plus prior renewals.
      const historyCount = Math.max(1, Math.floor((endDate.getTime() - joinDate.getTime()) / (planRow.durationDays * 86_400_000)));
      let cursorEnd = endDate;
      const createdMemberships: { id: string; payable: number }[] = [];

      for (let h = 0; h < Math.min(historyCount, 5); h++) {
        const mEnd = cursorEnd;
        const mStart = addDays(mEnd, -(planRow.durationDays - 1));
        const discount = rnd() < 0.18 ? int(1, 8) * 10_000 : 0;
        const joiningFee = h === Math.min(historyCount, 5) - 1 ? planRow.joiningFee : 0;
        const payable = Math.max(0, planRow.price - discount + joiningFee);

        const ms = await db.membership.create({
          data: {
            gymId: gym.id,
            memberId: member.id,
            planId: planRow.id,
            planName: planRow.name,
            startDate: mStart,
            endDate: mEnd,
            durationDays: planRow.durationDays,
            price: planRow.price,
            discount,
            payable,
            status: h === 0 ? (frozen ? "FROZEN" : isExpired ? "EXPIRED" : "ACTIVE") : "EXPIRED",
            isRenewal: h < Math.min(historyCount, 5) - 1,
            createdAt: mStart,
          },
        });
        createdMemberships.push({ id: ms.id, payable });
        cursorEnd = addDays(mStart, -1);
      }

      // Payments. ~16% of members carry a genuine outstanding balance —
      // which is the point of the dues reminder, so it must exist in demo data.
      let totalPaid = 0;
      const leavesBalance = rnd() < 0.16;
      for (let idx = 0; idx < createdMemberships.length; idx++) {
        const ms = createdMemberships[idx];
        const isCurrent = idx === 0;
        const amount =
          isCurrent && leavesBalance ? Math.round(ms.payable * pick([0.3, 0.5, 0.6])) : ms.payable;
        if (amount <= 0) continue;

        await db.payment.create({
          data: {
            gymId: gym.id,
            memberId: member.id,
            membershipId: ms.id,
            amount,
            mode: pick(["CASH", "UPI", "UPI", "CARD", "BANK"]),
            paidAt: addDays(TODAY, -int(1, 200)),
            invoiceNo: `INV-2026-${code.slice(4)}${idx}`,
            collectedByStaffId: null,
          },
        });
        totalPaid += amount;
      }

      // Check-ins: active members mostly attend; a slice goes quiet, which
      // is what the inactivity automation is for.
      let lastCheckIn: Date | null = null;
      if (!isExpired && !frozen) {
        const quiet = rnd() < 0.22;
        const visits = quiet ? int(1, 4) : int(8, 40);
        const mostRecentOffset = quiet ? int(14, 40) : int(0, 3);
        for (let v = 0; v < visits; v++) {
          const at = addDays(TODAY, -(mostRecentOffset + v * int(1, 4)));
          if (at < joinDate) break;
          const stamp = new Date(at.getTime() + int(6, 21) * 3_600_000);
          await db.checkIn.create({
            data: { gymId: gym.id, memberId: member.id, checkInAt: stamp, method: "CODE" },
          });
          if (!lastCheckIn || stamp > lastCheckIn) lastCheckIn = stamp;
        }
      }

      const totalBilled = createdMemberships.reduce((s, m) => s + m.payable, 0);
      await db.member.update({
        where: { id: member.id },
        data: {
          expiryDate: endDate,
          activePlanName: planRow.name,
          totalPaid,
          balanceDue: Math.max(0, totalBilled - totalPaid),
          lastCheckInAt: lastCheckIn,
        },
      });
    }

    await db.gym.update({
      where: { id: gym.id },
      data: { memberSeq: spec.memberCount, invoiceSeq: spec.memberCount * 2 },
    });

    // ── Leads ─────────────────────────────────────────────────────────────
    if (spec.full) {
      const leadCount = int(6, 14);
      for (let i = 0; i < leadCount; i++) {
        const first = pick(FIRST_NAMES);
        const last = pick(LAST_NAMES);
        const status = pick(["NEW", "NEW", "CONTACTED", "CONTACTED", "TRIAL", "WON", "LOST"]);
        await db.lead.create({
          data: {
            gymId: gym.id,
            name: `${first} ${last}`,
            phone: phoneFor(nameCursor++ + 900),
            source: pick(["WALKIN", "INSTAGRAM", "GOOGLE", "REFERRAL", "PHONE"]),
            interest: pick(["1 Month", "3 Months", "Personal Training", "Just enquiring"]),
            status,
            followUpAt: status === "NEW" || status === "CONTACTED" ? addDays(TODAY, int(-2, 5)) : null,
            notes: status === "LOST" ? "Said it was too far from home." : null,
            lostReason: status === "LOST" ? "Distance" : null,
            createdAt: addDays(TODAY, -int(0, 40)),
          },
        });
      }
    }

    // ── Message history ───────────────────────────────────────────────────
    // Past sends, so the outbox and usage charts aren't empty on first load.
    if (spec.full) {
      const recentMembers = await db.member.findMany({
        where: { gymId: gym.id },
        take: 40,
        select: { id: true, name: true, phone: true, code: true, expiryDate: true },
      });
      const tmpl = DEFAULT_TEMPLATES[0];
      for (let d = 1; d <= 45; d++) {
        const howMany = int(0, 3);
        for (let k = 0; k < howMany; k++) {
          const m = pick(recentMembers);
          const when = addDays(TODAY, -d);
          const stamp = new Date(when.getTime() + 10 * 3_600_000);
          const failed = rnd() < 0.05;
          await db.messageLog.create({
            data: {
              gymId: gym.id,
              memberId: m.id,
              toPhone: m.phone,
              templateKey: tmpl.key,
              body: tmpl.body
                .replace(/\{\{first_name\}\}/g, m.name.split(" ")[0])
                .replace(/\{\{gym_name\}\}/g, spec.name)
                .replace(/\{\{plan_name\}\}/g, "3 Months")
                .replace(/\{\{expiry_date\}\}/g, "28 Nov 2026")
                .replace(/\{\{days_left\}\}/g, "7")
                .replace(/\{\{renew_link\}\}/g, `http://localhost:3000/r/${m.id}`),
              kind: "AUTOMATED",
              status: failed ? "FAILED" : pick(["SENT", "DELIVERED", "DELIVERED", "READ"]),
              provider: "sandbox",
              providerMessageId: failed ? null : `sbx_seed_${d}_${k}`,
              error: failed ? "Simulated carrier rejection (sandbox): handset unreachable" : null,
              attempts: failed ? 3 : 1,
              costPaise: failed ? 0 : 11,
              scheduledFor: stamp,
              sentAt: failed ? null : stamp,
              createdAt: stamp,
              dedupeKey: `seed:${gym.id}:${d}:${k}:${m.id}`,
            },
          });
        }
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  const counts = {
    gyms: await db.gym.count(),
    staff: await db.staffUser.count(),
    members: await db.member.count(),
    memberships: await db.membership.count(),
    payments: await db.payment.count(),
    checkIns: await db.checkIn.count(),
    leads: await db.lead.count(),
    templates: await db.waTemplate.count(),
    rules: await db.reminderRule.count(),
    messages: await db.messageLog.count(),
  };

  console.log("\n✅ Seed complete\n");
  console.table(counts);
  console.log(`
┌─ Sign in ────────────────────────────────────────────────────┐
│                                                              │
│  Gym owner      http://localhost:3000/login                  │
│    owner@ironcore.in      / gym1234   (64 members, Growth)   │
│    owner@pulsearena.in    / gym1234   (23 members, Trial)    │
│    owner@titanstrength.in / gym1234   (38 members, Pro)      │
│    desk@iron-core.in      / gym1234   (front-desk role)      │
│                                                              │
│  Astryx admin   http://localhost:3000/admin/login            │
│    admin@astryx.app       / astryx123                        │
│    support@astryx.app     / astryx123 (read-only role)       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
