"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { saveAvatar, UploadError } from "@/lib/upload";
import {
  changePasswordSchema,
  deleteAccountSchema,
  updatePreferencesSchema,
  updateProfileSchema,
} from "@/lib/validation/auth";
import { fail, ok, type ActionResult } from "./result";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthenticated");
  return session.user;
}

export async function updateProfileAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  const user = await requireSession();
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) {
    return fail(
      "Check the highlighted fields",
      parsed.error.flatten().fieldErrors,
    );
  }

  let avatarUrl: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    try {
      avatarUrl = await saveAvatar(avatar, user.id);
    } catch (err) {
      const msg =
        err instanceof UploadError ? err.message : "Could not save the image";
      return fail(msg, { avatar: [msg] });
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      bio: parsed.data.bio ?? null,
      ...(avatarUrl ? { avatarUrl } : {}),
    },
  });

  revalidatePath("/settings");
  return ok({ updated: true });
}

export async function updatePreferencesAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  const user = await requireSession();
  const parsed = updatePreferencesSchema.safeParse({
    language: formData.get("language"),
    currency: formData.get("currency"),
    personality: formData.get("personality") || null,
  });
  if (!parsed.success) {
    return fail(
      "Check the highlighted fields",
      parsed.error.flatten().fieldErrors,
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      language: parsed.data.language,
      currency: parsed.data.currency,
      personality: parsed.data.personality ?? null,
    },
  });

  revalidatePath("/settings");
  return ok({ updated: true });
}

export async function changePasswordAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  const user = await requireSession();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return fail(
      "Check the highlighted fields",
      parsed.error.flatten().fieldErrors,
    );
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!dbUser?.passwordHash) {
    return fail("Password change isn't available for this account");
  }

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    dbUser.passwordHash,
  );
  if (!valid) {
    return fail("Current password is incorrect", {
      currentPassword: ["Incorrect"],
    });
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  return ok({ updated: true });
}

export async function deleteAccountAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult<never>> {
  const user = await requireSession();
  const parsed = deleteAccountSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return fail(
      "Type DELETE MY ACCOUNT to confirm",
      parsed.error.flatten().fieldErrors,
    );
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!dbUser?.passwordHash) {
    return fail("Password verification isn't available for this account");
  }

  const valid = await verifyPassword(parsed.data.password, dbUser.passwordHash);
  if (!valid) {
    return fail("Password is incorrect", { password: ["Incorrect"] });
  }

  await db.user.delete({ where: { id: user.id } });
  await signOut({ redirectTo: "/" });
  redirect("/");
}
