import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { hash as bcryptHash, compare as bcryptCompare } from "bcryptjs";

import { db } from "./db";
import type { StaffRole } from "./constants";

const STAFF_COOKIE = "astryx_staff";
const PLATFORM_COOKIE = "astryx_platform";
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 24) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a 32+ character random string in .env.",
    );
  }
  return new TextEncoder().encode(value);
}

// ── Passwords ───────────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcryptHash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcryptCompare(plain, hash);
  } catch {
    return false;
  }
}

// ── Session payloads ────────────────────────────────────────────────────────

export type StaffSession = {
  staffId: string;
  gymId: string;
  role: StaffRole;
  name: string;
  email: string;
  /** Set when a platform admin is viewing this gym on the owner's behalf. */
  impersonatedBy?: string;
  impersonatorName?: string;
};

export type PlatformSession = {
  userId: string;
  role: "SUPERADMIN" | "SUPPORT";
  name: string;
  email: string;
};

async function sign(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

async function read<T>(cookieName: string): Promise<T | null> {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload as T;
  } catch {
    return null;
  }
}

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

// ── Gym staff ───────────────────────────────────────────────────────────────

export async function createStaffSession(session: StaffSession): Promise<void> {
  const store = await cookies();
  store.set(STAFF_COOKIE, await sign({ ...session }), COOKIE_OPTS);
}

export async function clearStaffSession(): Promise<void> {
  (await cookies()).delete(STAFF_COOKIE);
}

export async function getStaffSession(): Promise<StaffSession | null> {
  return read<StaffSession>(STAFF_COOKIE);
}

/**
 * The authoritative gate for every gym-scoped page and action.
 *
 * Re-reads the gym and staff row on each call rather than trusting the JWT:
 * a suspended gym or a deactivated staff member loses access immediately
 * instead of at cookie expiry.
 */
export async function requireStaff() {
  const session = await getStaffSession();
  if (!session) redirect("/login");

  const staff = await db.staffUser.findUnique({
    where: { id: session.staffId },
    include: { gym: { include: { saasPlan: true } } },
  });

  if (!staff || !staff.active || staff.gymId !== session.gymId) {
    await clearStaffSession();
    redirect("/login?error=session");
  }
  if (staff.gym.status === "SUSPENDED" || staff.gym.status === "CANCELLED") {
    // Impersonating admins still get in, so support can fix the account.
    if (!session.impersonatedBy) redirect("/login?error=suspended");
  }

  return { session, staff, gym: staff.gym };
}

export async function requireRole(roles: readonly StaffRole[]) {
  const ctx = await requireStaff();
  if (!roles.includes(ctx.staff.role as StaffRole)) {
    redirect("/app?error=forbidden");
  }
  return ctx;
}

/** Non-redirecting role check, for hiding UI the user cannot use. */
export function can(role: string, allowed: readonly StaffRole[]): boolean {
  return allowed.includes(role as StaffRole);
}

// ── Platform (Astryx) staff ─────────────────────────────────────────────────

export async function createPlatformSession(session: PlatformSession): Promise<void> {
  const store = await cookies();
  store.set(PLATFORM_COOKIE, await sign({ ...session }), COOKIE_OPTS);
}

export async function clearPlatformSession(): Promise<void> {
  (await cookies()).delete(PLATFORM_COOKIE);
}

export async function getPlatformSession(): Promise<PlatformSession | null> {
  return read<PlatformSession>(PLATFORM_COOKIE);
}

export async function requirePlatform() {
  const session = await getPlatformSession();
  if (!session) redirect("/admin/login");

  const user = await db.platformUser.findUnique({ where: { id: session.userId } });
  if (!user || !user.active) {
    await clearPlatformSession();
    redirect("/admin/login?error=session");
  }
  return { session, user };
}

/** SUPPORT can read everything but may not mutate billing or delete tenants. */
export async function requireSuperadmin() {
  const ctx = await requirePlatform();
  if (ctx.user.role !== "SUPERADMIN") redirect("/admin?error=forbidden");
  return ctx;
}
