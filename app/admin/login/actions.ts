"use server";

import { redirect } from "next/navigation";

import { createPlatformSession, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { fieldErrors, loginSchema, type FormState } from "@/lib/validation";

export async function loginPlatform(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { email, password } = parsed.data;
  const user = await db.platformUser.findFirst({ where: { email, active: true } });

  const generic = { ok: false as const, errors: { _form: "Email or password is incorrect." } };
  if (!user) return generic;
  if (!(await verifyPassword(password, user.passwordHash))) {
    await audit({ actorType: "SYSTEM", action: "admin.login_failed", meta: { email } });
    return generic;
  }

  await createPlatformSession({
    userId: user.id,
    role: user.role as "SUPERADMIN" | "SUPPORT",
    name: user.name,
    email: user.email,
  });
  await db.platformUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({
    actorType: "PLATFORM",
    actorId: user.id,
    actorName: user.name,
    action: "admin.login",
  });

  redirect("/admin");
}

export async function logoutPlatform() {
  const { clearPlatformSession } = await import("@/lib/auth");
  await clearPlatformSession();
  redirect("/admin/login");
}
