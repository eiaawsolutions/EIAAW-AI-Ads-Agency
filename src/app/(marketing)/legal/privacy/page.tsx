import Link from "next/link";

export const metadata = { title: "Privacy" };

const EFFECTIVE = "2026-04-18";
const VERSION = "v1.0";

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="meta">Effective {EFFECTIVE} · {VERSION} · governing entity: EIAAW Solutions (Malaysia)</p>

      <p>
        EIAAW Solutions (&ldquo;EIAAW,&rdquo; &ldquo;we&rdquo;) operates the autonomous AI ads platform at
        <Link href="/"> ads.eiaawsolutions.com</Link> (the &ldquo;Service&rdquo;). This policy describes
        what personal data we collect, how we use it, who we share it with, your rights, and how to reach us.
      </p>
      <p>
        It applies to visitors of our marketing site, customers of the Service, and prospects who contact us
        through the enterprise intake form or live demo. For data we process <em>on behalf of</em> our
        customers (their end users, their ad accounts), the Data Processing Addendum at
        <Link href="/trust#dpa"> /trust#dpa</Link> governs.
      </p>

      <h2>1. Roles &amp; jurisdictions</h2>
      <p>
        EIAAW is the <strong>data controller</strong> for: visitor analytics, account holders, demo and
        intake submissions, and billing data. EIAAW is the <strong>data processor</strong> for: customer
        ad-account data accessed via OAuth, AI agent inputs/outputs, and metric exports.
      </p>
      <p>
        We comply with Malaysia&apos;s Personal Data Protection Act 2010 (PDPA) as our home regime, and we
        operate to GDPR (EU) and UK GDPR standards for visitors and customers in those jurisdictions. For
        California residents, CCPA/CPRA rights are honored on request.
      </p>

      <h2>2. What we collect</h2>

      <h3>2.1 Account &amp; identity</h3>
      <ul>
        <li>Email address, name, optional profile image (from Google OIDC sign-in).</li>
        <li>Workspace metadata: organization name, slug, plan tier.</li>
        <li>Session tokens (HTTP-only cookies, signed and encrypted).</li>
      </ul>

      <h3>2.2 Live demo &amp; enterprise intake</h3>
      <ul>
        <li>Work email, full name, company, optional job title, monthly ad-spend band, platforms in scope, free-text message.</li>
        <li>For the live <code>ads-dna</code> demo: the URL you submit and the agent output we generate from it.</li>
        <li>A <strong>SHA-256 hash of your IP address</strong> (salted with our application secret) — never the raw IP — and your User-Agent string, used for abuse prevention only.</li>
      </ul>

      <h3>2.3 OAuth tokens (when you connect an ad platform)</h3>
      <ul>
        <li>Access tokens, refresh tokens, expiry timestamps, scopes granted, ad-account identifiers.</li>
        <li>All tokens are encrypted at rest with AES-256-GCM envelope encryption using a per-environment key. See <Link href="/trust#encryption">/trust#encryption</Link>.</li>
      </ul>

      <h3>2.4 AI agent runs</h3>
      <ul>
        <li>Inputs you submit to agents, outputs we generate, prompt version, model, tokens consumed, cost.</li>
        <li>This is your data. We use it to deliver the Service to you, and aggregated/anonymized for product improvement. We do not use your prompts or outputs to train third-party models.</li>
      </ul>

      <h3>2.5 Billing</h3>
      <ul>
        <li>Stripe customer ID, subscription ID, plan, status, billing email. Card details are handled directly by Stripe under PCI DSS Level 1; we never see them.</li>
      </ul>

      <h3>2.6 Telemetry &amp; observability</h3>
      <ul>
        <li>Server-side logs: request method, path, status code, timing, error stacks (in private workspaces, with PII scrubbed).</li>
        <li>We do not run third-party ad pixels or session replay on this site.</li>
      </ul>

      <h2>3. Why we use it (legal bases under GDPR)</h2>
      <ul>
        <li><strong>Performance of contract</strong> — to provide the Service you signed up for.</li>
        <li><strong>Legitimate interests</strong> — abuse prevention, security monitoring, fraud detection, basic analytics. We balance these against your rights and apply data minimization (e.g. IP-hashing instead of storing raw IPs).</li>
        <li><strong>Legal obligation</strong> — tax and accounting records, regulator requests valid under PDPA / GDPR.</li>
        <li><strong>Consent</strong> — for marketing communications (you can withdraw at any time).</li>
      </ul>

      <h2>4. Who we share it with (sub-processors)</h2>
      <p>
        A current sub-processor list — vendor, purpose, region, attestations — is published at
        <Link href="/trust#sub-processors"> /trust#sub-processors</Link>. We notify enterprise customers at
        least 30 days before adding any sub-processor that processes regulated data.
      </p>
      <p>
        We do <strong>not</strong> sell personal data. We do not disclose personal data to third parties
        except: (a) sub-processors strictly necessary to deliver the Service, (b) when you instruct us to
        (e.g. connecting an ad platform), or (c) when required by valid legal process.
      </p>

      <h2>5. International transfers</h2>
      <p>
        The primary infrastructure region for production is <code>ap-southeast-1 (Singapore)</code> via
        Railway. AI inference is processed in the United States by Anthropic. Cross-border transfers are
        covered by the EU Standard Contractual Clauses (2021) with the UK Addendum, and a PDPA
        cross-border transfer notice for Malaysia residents.
      </p>

      <h2>6. Retention</h2>
      <ul>
        <li><strong>Account &amp; workspace data</strong> — for the life of the account, plus 90 days after termination, then deleted unless legally required to retain.</li>
        <li><strong>Demo / intake submissions</strong> — 24 months from submission, then anonymized.</li>
        <li><strong>OAuth tokens</strong> — until you disconnect the integration or the upstream provider revokes them; encrypted versions only.</li>
        <li><strong>AI agent runs</strong> — for the life of the workspace; raw prompt/output payloads can be purged on request.</li>
        <li><strong>Server logs</strong> — 30 days, then rolled off.</li>
        <li><strong>Backups</strong> — daily snapshot, 7-day retention.</li>
      </ul>

      <h2>7. Your rights</h2>
      <p>You can exercise the following rights at any time by emailing <a href="mailto:privacy@eiaawsolutions.com">privacy@eiaawsolutions.com</a>:</p>
      <ul>
        <li><strong>Access</strong> — receive a copy of personal data we hold about you (machine-readable JSON within 30 days).</li>
        <li><strong>Rectification</strong> — correct inaccurate or incomplete data.</li>
        <li><strong>Erasure</strong> (&ldquo;right to be forgotten&rdquo;) — delete your data, subject to legal retention.</li>
        <li><strong>Portability</strong> — receive your data in a structured, machine-readable format.</li>
        <li><strong>Objection</strong> — object to processing based on legitimate interests.</li>
        <li><strong>Withdraw consent</strong> — for any processing based on consent.</li>
        <li><strong>Lodge a complaint</strong> — with the Personal Data Protection Department (Malaysia) at <a href="https://www.pdp.gov.my" target="_blank" rel="noreferrer">pdp.gov.my</a>, or with your local supervisory authority.</li>
      </ul>

      <h2>8. Security</h2>
      <p>
        Full security posture, encryption details, sub-processor list, and incident response SLA are at
        <Link href="/trust"> /trust</Link>. Highlights: AES-256-GCM at rest, TLS 1.3 in transit, Postgres
        RLS for tenant isolation, AgentRun audit trail, daily AI-cost circuit breakers.
      </p>

      <h2>9. Cookies</h2>
      <p>
        We use only first-party, strictly necessary cookies — session cookies for authentication and a
        cookie consent record. We do not use third-party advertising or tracking cookies on this site.
      </p>

      <h2>10. Children</h2>
      <p>The Service is not directed to anyone under 18. We do not knowingly collect personal data from minors.</p>

      <h2>11. Changes</h2>
      <p>
        Material changes to this policy are announced at least 30 days in advance to active customers via
        email, and the previous version is preserved at <code>/legal/privacy?version=&lt;v&gt;</code>.
      </p>

      <h2>12. Contact</h2>
      <ul>
        <li>Privacy &amp; data subject requests: <a href="mailto:privacy@eiaawsolutions.com">privacy@eiaawsolutions.com</a></li>
        <li>Security disclosure: <a href="mailto:security@eiaawsolutions.com">security@eiaawsolutions.com</a></li>
        <li>Legal &amp; DPA: <a href="mailto:legal@eiaawsolutions.com">legal@eiaawsolutions.com</a></li>
      </ul>
    </>
  );
}
