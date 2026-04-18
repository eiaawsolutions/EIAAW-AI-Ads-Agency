import Link from "next/link";

export const metadata = { title: "Terms of Service" };

const EFFECTIVE = "2026-04-18";
const VERSION = "v1.0";

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="meta">Effective {EFFECTIVE} · {VERSION} · governing law: Malaysia</p>

      <p>
        These Terms govern your use of the EIAAW Solutions autonomous AI ads platform at
        <Link href="/"> ads.eiaawsolutions.com</Link> (the &ldquo;Service&rdquo;), provided by EIAAW Solutions
        (&ldquo;EIAAW,&rdquo; &ldquo;we&rdquo;) to you or the entity you represent (&ldquo;Customer&rdquo;).
        For Enterprise customers under a signed order form, that order form &amp; any attached MSA take
        precedence over these public Terms in the event of conflict.
      </p>

      <h2>1. Account &amp; access</h2>
      <ul>
        <li>You must be 18+ and authorized to bind the entity you represent.</li>
        <li>You are responsible for all activity under your account, including users you invite.</li>
        <li>Keep credentials confidential. Notify us promptly if you suspect compromise: <a href="mailto:security@eiaawsolutions.com">security@eiaawsolutions.com</a>.</li>
      </ul>

      <h2>2. The Service</h2>
      <p>
        EIAAW provides a multi-agent runtime for planning, launching, optimizing, and scaling paid advertising
        campaigns across supported platforms. You connect your own ad accounts via OAuth; you remain the
        owner of those accounts and the budgets they hold. Platform availability and feature scope are
        described at <Link href="/platform">/platform</Link>, <Link href="/agents">/agents</Link>, and
        <Link href="/pricing"> /pricing</Link>.
      </p>

      <h2>3. Acceptable Use Policy</h2>
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>Violate any applicable law, the policies of the ad platforms you connect, or third-party rights.</li>
        <li>Run advertising for prohibited categories on those platforms (illegal goods, regulated products without proper licensing, etc.).</li>
        <li>Reverse-engineer, decompile, or attempt to extract source code of the Service.</li>
        <li>Probe, scan, or load-test the Service without prior written consent.</li>
        <li>Use the live demo or trial accounts to circumvent paid usage caps, scrape AI output, or abuse rate limits.</li>
        <li>Submit personal data of third parties to AI agents without a lawful basis under applicable privacy law.</li>
        <li>Generate advertising or content that is deceptive, fraudulent, infringing, hateful, or otherwise prohibited under platform community standards.</li>
      </ul>
      <p>We may suspend or terminate access for material violations, with notice where reasonably practicable.</p>

      <h2>4. AI-generated output</h2>
      <ul>
        <li>You are responsible for reviewing AI-generated copy, creative, and budget recommendations before they are launched on a paid platform — even when running in autonomous mode. The Service provides defaults and guardrails (cost caps, A/B test gates), but the final business decision is yours.</li>
        <li>AI output may contain inaccuracies. We do not warrant that any specific creative or recommendation will perform to a specific KPI.</li>
        <li>You retain ownership of inputs you submit and outputs we generate for you, subject to underlying platform / model licenses where applicable.</li>
      </ul>

      <h2>5. Fees &amp; billing</h2>
      <ul>
        <li>Subscription fees are stated at <Link href="/pricing">/pricing</Link> or in your order form, billed monthly or annually in advance via Stripe.</li>
        <li>Fees do not include the ad spend you incur on connected platforms — you pay those platforms directly.</li>
        <li>Fees are non-refundable except where required by law. Trial periods are stated at signup; downgrade or cancel within the trial to avoid charges.</li>
        <li>We may revise pricing with 30 days&apos; notice; existing annual contracts are honored to the end of the current term.</li>
        <li>Daily AI-cost caps apply per workspace tier and protect both parties from runaway model spend. Caps are documented at <Link href="/trust">/trust</Link>.</li>
      </ul>

      <h2>6. Customer data &amp; privacy</h2>
      <p>
        Our processing of personal data is governed by the <Link href="/legal/privacy">Privacy Policy</Link>
        and, for data we process on your behalf, the Data Processing Addendum at
        <Link href="/trust#dpa"> /trust#dpa</Link>. You warrant that you have the lawful basis to provide
        any personal data you submit to the Service (including end-user data flowing through OAuth-connected
        ad accounts).
      </p>

      <h2>7. Confidentiality</h2>
      <p>
        Each party will protect the other&apos;s confidential information using at least the same care it
        uses for its own confidential information of similar sensitivity, and not less than reasonable care.
        This obligation survives termination for 3 years, except for trade secrets, which survive
        indefinitely.
      </p>

      <h2>8. Intellectual property</h2>
      <ul>
        <li>EIAAW retains all rights to the Service, the underlying agent runtime, prompts, models we license, our brand, and aggregated/anonymized usage data.</li>
        <li>You retain all rights to your inputs, your outputs, and your brand assets. You grant us a worldwide, royalty-free license to host, process, and display them solely to provide the Service to you.</li>
        <li>Feedback you provide is given freely; we may use it to improve the Service without obligation.</li>
      </ul>

      <h2>9. Warranty disclaimer</h2>
      <p>
        Except as expressly stated, the Service is provided <strong>&ldquo;as is&rdquo; and &ldquo;as
        available&rdquo;</strong>. We disclaim all implied warranties including merchantability, fitness for
        a particular purpose, non-infringement, and any warranty arising out of course of dealing or trade
        usage. We do not warrant uninterrupted or error-free operation, or that AI output will meet specific
        performance or conversion targets.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, neither party is liable for indirect, incidental, special,
        consequential, or punitive damages, or for lost profits, lost revenue, lost goodwill, or lost data,
        regardless of theory.
      </p>
      <p>
        Each party&apos;s aggregate liability arising out of or related to these Terms will not exceed the
        fees you paid for the Service in the <strong>12 months preceding</strong> the event giving rise to
        liability. Caps do not apply to: a party&apos;s indemnification obligations, your payment
        obligations, your breach of the AUP, or either party&apos;s gross negligence or willful misconduct.
      </p>

      <h2>11. Indemnification</h2>
      <ul>
        <li><strong>By EIAAW</strong> — we will defend you against third-party claims that the Service, as provided by us and used in accordance with these Terms, infringes a third party&apos;s IP rights, and pay damages awarded or settlements approved by us.</li>
        <li><strong>By Customer</strong> — you will defend EIAAW against third-party claims arising from (a) your inputs or generated outputs that you launched, (b) breach of the AUP, or (c) your use of the Service in violation of law.</li>
        <li>Carve-out: EIAAW has no obligation for claims arising from inputs you supplied or AI output you launched without review.</li>
      </ul>

      <h2>12. Suspension &amp; termination</h2>
      <ul>
        <li>Either party may terminate for material breach if uncured 30 days after written notice.</li>
        <li>We may immediately suspend access for: payment failure beyond 14 days, security risk to other customers, or AUP violations of a serious nature.</li>
        <li>On termination: your data is retained read-only for 90 days for export, then deleted (subject to legal retention). You can export at any time via the dashboard or by request.</li>
      </ul>

      <h2>13. Service availability</h2>
      <p>
        Uptime targets, severity definitions, and incident response are published at
        <Link href="/trust#incident-response"> /trust#incident-response</Link>. Enterprise customers may
        contract a written SLA with credits via order form.
      </p>

      <h2>14. Changes to the Service or Terms</h2>
      <p>
        We may modify the Service or these Terms; we&apos;ll announce material changes at least 30 days in
        advance to active customers via email. Continued use after the effective date constitutes
        acceptance. If you object, you may terminate before the change takes effect with a pro-rata refund
        of pre-paid fees.
      </p>

      <h2>15. Governing law &amp; venue</h2>
      <p>
        These Terms are governed by the laws of Malaysia. Disputes are subject to the exclusive jurisdiction
        of the courts of Kuala Lumpur, except that either party may seek injunctive relief in any court of
        competent jurisdiction. Enterprise customers may negotiate alternative governing law in their order
        form.
      </p>

      <h2>16. Miscellaneous</h2>
      <ul>
        <li><strong>Assignment</strong> — neither party may assign without the other&apos;s consent, except in connection with a merger, acquisition, or sale of substantially all assets.</li>
        <li><strong>Force majeure</strong> — neither party is liable for delay or failure due to events beyond reasonable control.</li>
        <li><strong>Entire agreement</strong> — these Terms (plus any Enterprise order form) are the entire agreement and supersede prior discussions.</li>
        <li><strong>Severability</strong> — if a provision is unenforceable, the remainder stays in effect.</li>
        <li><strong>No waiver</strong> — failure to enforce is not waiver.</li>
      </ul>

      <h2>17. Contact</h2>
      <ul>
        <li>Legal &amp; contracts: <a href="mailto:legal@eiaawsolutions.com">legal@eiaawsolutions.com</a></li>
        <li>Billing &amp; account: <a href="mailto:billing@eiaawsolutions.com">billing@eiaawsolutions.com</a></li>
        <li>Security: <a href="mailto:security@eiaawsolutions.com">security@eiaawsolutions.com</a></li>
      </ul>
    </>
  );
}
