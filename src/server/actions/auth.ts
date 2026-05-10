"use server";

import { redirect } from "next/navigation";
import crypto from "node:crypto";

import { db } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import { hashPassword } from "@/lib/passwords";
import { buildPasswordResetEmail, sendEmail } from "@/lib/email";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation/auth";
import { fail, ok, type ActionResult } from "./result";

const RESET_TTL_MIN = 60;

export async function signupAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return fail(
      "Check the highlighted fields",
      parsed.error.flatten().fieldErrors,
    );
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) {
    return fail("An account with that email already exists", {
      email: ["Already registered"],
    });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
    },
  });

  // Sign the user in immediately, then redirect to dashboard.
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/dashboard",
  });

  return ok({ email: parsed.data.email });
}

export async function loginAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return fail(
      "Check the highlighted fields",
      parsed.error.flatten().fieldErrors,
    );
  }

  const callbackUrl =
    typeof formData.get("callbackUrl") === "string"
      ? (formData.get("callbackUrl") as string)
      : "/dashboard";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (err) {
    // NextAuth throws a special redirect on success — re-throw it.
    if ((err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    return fail("Email or password is incorrect");
  }

  return ok({ email: parsed.data.email });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function forgotPasswordAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ sent: true }>> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return fail("Enter a valid email", parsed.error.flatten().fieldErrors);
  }

  // Always behave the same regardless of whether the user exists,
  // to avoid disclosing valid emails.
  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, passwordHash: true },
  });

  if (user?.passwordHash) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000);

    await db.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiresAt: expiresAt },
    });

    const base =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${base}/reset-password?token=${token}`;
    const email = buildPasswordResetEmail({
      resetUrl,
      expiresInMinutes: RESET_TTL_MIN,
    });

    await sendEmail({
      to: user.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  }

  return ok({ sent: true });
}

export async function resetPasswordAction(
  _: unknown,
  formData: FormData,
): Promise<ActionResult<{ reset: true }>> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return fail(
      "Check the highlighted fields",
      parsed.error.flatten().fieldErrors,
    );
  }

  const user = await db.user.findFirst({
    where: {
      resetToken: parsed.data.token,
      resetTokenExpiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  if (!user) {
    return fail("This reset link is invalid or has expired");
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
    },
  });

  redirect("/login?reset=1");
}
