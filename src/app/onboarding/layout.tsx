import { MarketingNavbar } from "@/components/marketing/navbar";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-hero">
      <MarketingNavbar />
      {children}
    </div>
  );
}
