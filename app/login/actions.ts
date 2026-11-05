"use server";

import { redirect } from "next/navigation";

import { createStaffSession, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { fieldErrors, loginSchema, type FormState } from "@/lib/validation";

/**
 * Staff sign-in.
 *
 * Failure messages are intentionally identical for "no such email" and
 * "wrong password" so the form can't be used to enumerate which gym owners
 * have accounts.
 */
export async function loginStaff(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { email, password } = parsed.data;

  const staff = await db.staffUser.findFirst({
    where: { email, active: true },
    include: { gym: true },
  });

  const generic = { ok: false as const, errors: { _form: "Email or password is incorrect." } };
  if (!staff) return generic;
  if (!(await verifyPassword(password, staff.passwordHash))) {
    await audit({
      gymId: staff.gymId,
      actorType: "SYSTEM",
      action: "auth.login_failed",
      entity: "StaffUser",
      entityId: staff.id,
      meta: { email },
    });
    return generic;
  }

  if (staff.gym.status === "SUSPENDED" || staff.gym.status === "CANCELLED") {
    return {
      ok: false,
      errors: {
        _form:
          "This account has been suspended. Please contact Astryx support to reactivate it.",
      },
    };
  }

  await createStaffSession({
    staffId: staff.id,
    gymId: staff.gymId,
    role: staff.role as "OWNER" | "MANAGER" | "FRONTDESK",
    name: staff.name,
    email: staff.email,
  });

  await db.staffUser.update({
    where: { id: staff.id },
    data: { lastLoginAt: new Date() },
  });
  await audit({
    gymId: staff.gymId,
    actorType: "STAFF",
    actorId: staff.id,
    actorName: staff.name,
    action: "auth.login",
  });

  redirect("/app");
}

export async function logoutStaff() {
  const { clearStaffSession } = await import("@/lib/auth");
  await clearStaffSession();
  redirect("/login");
}
