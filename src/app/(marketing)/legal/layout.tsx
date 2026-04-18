import Link from "next/link";

const LEGAL_NAV: [string, string][] = [
  ["Privacy", "/legal/privacy"],
  ["Terms",   "/legal/terms"],
  ["DPA",     "/trust#dpa"],
  ["Security","/trust"],
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <section className="relative overflow-hidden bg-dawn-subtle">
        <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" />
        <div className="container relative pt-20 pb-8 md:pt-28">
          <span className="eyebrow">Legal</span>
          <div className="mt-4 flex items-center gap-2 flex-wrap text-xs">
            {LEGAL_NAV.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-md border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-12 lg:py-20">
        <article className="legal-prose max-w-3xl mx-auto">
          {children}
        </article>
      </section>
    </main>
  );
}
