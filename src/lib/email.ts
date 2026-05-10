import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM ?? "Traveloop <noreply@traveloop.local>";

const resend = apiKey ? new Resend(apiKey) : null;

interface SendEmailArgs {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailArgs) {
  if (!resend) {
    // Dev fallback: log the message so the URL is reachable from terminal output.
    console.info("\n[email:console-fallback]");
    console.info(`  to     : ${to}`);
    console.info(`  subject: ${subject}`);
    console.info(`  body   : ${text}\n`);
    return { id: "dev-fallback" };
  }

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      text,
      html,
    });
    return { id: result.data?.id ?? "sent" };
  } catch (err) {
    console.error("[email] send failed", err);
    throw new Error("Email delivery failed");
  }
}

export function buildPasswordResetEmail(args: {
  resetUrl: string;
  expiresInMinutes: number;
}) {
  const { resetUrl, expiresInMinutes } = args;
  return {
    subject: "Reset your Traveloop password",
    text:
      `Use this link to set a new password for your Traveloop account.\n\n` +
      `${resetUrl}\n\n` +
      `The link expires in ${expiresInMinutes} minutes. ` +
      `If you didn't request this, you can ignore the message.`,
    html:
      `<p>Use this link to set a new password for your Traveloop account.</p>` +
      `<p><a href="${resetUrl}">${resetUrl}</a></p>` +
      `<p>The link expires in ${expiresInMinutes} minutes. ` +
      `If you didn't request this, you can ignore the message.</p>`,
  };
}
