/**
 * Welcome email — sent after Stripe checkout.session.completed.
 *
 * Lean intentionally — single-column, brand-aligned, plain HTML that
 * works in every client. No external CSS, no images that block on load.
 */
export function renderWelcomeEmail(input: {
  email: string;
  plan: "STARTER" | "GROWTH" | "ENTERPRISE";
  trialEnd: Date | null;
  hasDiscount: boolean;
  discountLabel: string | null;
  appUrl: string;
}): { subject: string; html: string } {
  const planName =
    input.plan === "GROWTH" ? "Growth" : input.plan === "ENTERPRISE" ? "Enterprise" : "Starter";
  const trialDateStr = input.trialEnd
    ? input.trialEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "14 days from today";

  const signInUrl = `${input.appUrl}/api/auth/signin/google?callbackUrl=${encodeURIComponent("/dashboard?welcome=1")}`;
  const dashboardUrl = `${input.appUrl}/dashboard`;

  const subject = `Welcome to EIAAW Ai Ads Agency — sign in to your ${planName} workspace`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F4F0EA;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1a1a1a;line-height:1.5;">
<div style="max-width:560px;margin:0 auto;padding:48px 24px;">

  <div style="font-size:14px;font-weight:600;color:#0E7D72;letter-spacing:0.05em;text-transform:uppercase;">EIAAW Ai Ads Agency</div>

  <h1 style="margin:24px 0 8px;font-size:28px;font-weight:600;color:#1a1a1a;">You're in.</h1>
  <p style="margin:0 0 32px;font-size:16px;color:#5a5a5a;">
    Your <strong>${planName}</strong> workspace is ready. One quick step to get inside:
    sign in with the Google account tied to <strong>${escapeHtml(input.email)}</strong>.
  </p>

  <div style="margin:0 0 32px;">
    <a href="${signInUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:500;">
      Continue with Google →
    </a>
  </div>

  <div style="margin:0 0 32px;border:1px solid #E5DFD3;border-radius:8px;background:#ffffff;overflow:hidden;">
    <div style="padding:16px 20px;border-bottom:1px solid #E5DFD3;">
      <div style="font-size:11px;font-weight:600;color:#5a5a5a;letter-spacing:0.05em;text-transform:uppercase;">Plan</div>
      <div style="margin-top:4px;font-size:15px;color:#1a1a1a;">${planName}</div>
    </div>
    ${
      input.hasDiscount && input.discountLabel
        ? `<div style="padding:16px 20px;border-bottom:1px solid #E5DFD3;">
      <div style="font-size:11px;font-weight:600;color:#5a5a5a;letter-spacing:0.05em;text-transform:uppercase;">Discount applied</div>
      <div style="margin-top:4px;font-size:15px;color:#0E7D72;">−${escapeHtml(input.discountLabel)}</div>
    </div>`
        : ""
    }
    <div style="padding:16px 20px;border-bottom:1px solid #E5DFD3;">
      <div style="font-size:11px;font-weight:600;color:#5a5a5a;letter-spacing:0.05em;text-transform:uppercase;">Trial ends</div>
      <div style="margin-top:4px;font-size:15px;color:#1a1a1a;">${trialDateStr}</div>
    </div>
    <div style="padding:16px 20px;">
      <div style="font-size:11px;font-weight:600;color:#5a5a5a;letter-spacing:0.05em;text-transform:uppercase;">Account email</div>
      <div style="margin-top:4px;font-size:15px;color:#1a1a1a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(input.email)}</div>
    </div>
  </div>

  <h2 style="margin:32px 0 12px;font-size:18px;font-weight:600;color:#1a1a1a;">First 15 minutes</h2>
  <ol style="margin:0 0 32px;padding-left:20px;font-size:15px;color:#3a3a3a;">
    <li style="margin-bottom:8px;">Connect your first ad platform on the Integrations page (Meta + Google live; others coming).</li>
    <li style="margin-bottom:8px;">Run the wizard — Brand DNA, Strategy, Forecast, Launch — to plan your first campaign.</li>
    <li style="margin-bottom:8px;">Watch the Live monitor as agents start auditing, optimising, and reporting.</li>
  </ol>

  <p style="margin:0 0 8px;font-size:14px;color:#5a5a5a;">
    Bookmark your workspace: <a href="${dashboardUrl}" style="color:#0E7D72;text-decoration:underline;">${dashboardUrl}</a>
  </p>

  <hr style="margin:40px 0;border:0;border-top:1px solid #E5DFD3;" />

  <p style="margin:0 0 12px;font-size:13px;color:#5a5a5a;">
    Questions, billing changes, or want to bring your team on? Reply to this email — a real person reads it.
  </p>
  <p style="margin:0;font-size:12px;color:#8a8a8a;">
    EIAAW Solutions · Kuala Lumpur, Malaysia<br/>
    <a href="${input.appUrl}/legal/terms" style="color:#8a8a8a;">Terms</a> ·
    <a href="${input.appUrl}/legal/privacy" style="color:#8a8a8a;">Privacy</a>
  </p>

</div>
</body>
</html>`;

  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
