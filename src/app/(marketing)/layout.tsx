import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-hero">
      <MarketingNavbar />
      {children}
      <MarketingFooter />
    </div>
  );
}
