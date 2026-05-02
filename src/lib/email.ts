import { Resend } from "resend";

/**
 * Resend-backed email sender.
 *
 * Mirrors the SMT (Sales Marketing Agent) pattern at
 * Sales marketing agent/src/utils/email.js — same Resend client, same
 * verified `eiaawsolutions.com` domain.
 *
 * Behavior:
 *   - If RESEND_API_KEY is unset, sendEmail() returns { sent: false }
 *     instead of throwing. Callers should treat email as best-effort
 *     (the welcome email is nice-to-have; failure should not break
 *     signup).
 *   - From-address defaults to `EIAAW Ai Ads Agency <ads@eiaawsolutions.com>`
 *     unless RESEND_FROM env is set. Resend requires the domain to be
 *     verified — `eiaawsolutions.com` is already verified per SMT's setup.
 */

const DEFAULT_FROM = "EIAAW Ai Ads Agency <ads@eiaawsolutions.com>";

let cached: Resend | null = null;
function client(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key || key.length < 10) return null;
  cached = new Resend(key);
  return cached;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

export type SendEmailResult =
  | { sent: true; id: string; provider: "resend" }
  | { sent: false; reason: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const c = client();
  if (!c) {
    console.warn(`[email] RESEND_API_KEY not set — skipping send to ${input.to} ("${input.subject}")`);
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const from = input.from ?? process.env.RESEND_FROM ?? DEFAULT_FROM;

  try {
    const res = await c.emails.send({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    });
    if (res.error) {
      console.error("[email] Resend send failed:", res.error.message, "to:", input.to);
      return { sent: false, reason: res.error.message };
    }
    const id = res.data?.id ?? "(unknown)";
    console.log(`[email] sent id=${id} to=${input.to} subject="${input.subject}"`);
    return { sent: true, id, provider: "resend" };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[email] Resend send threw:", reason, "to:", input.to);
    return { sent: false, reason };
  }
}
