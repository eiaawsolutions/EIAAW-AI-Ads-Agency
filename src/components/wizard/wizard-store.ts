"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WizardStep =
  | "welcome"
  | "dna"
  | "plan"
  | "competitor"
  | "forecast"
  | "creative"
  | "launch"
  | "done";

export type CreativeCta =
  | "LEARN_MORE"
  | "SHOP_NOW"
  | "SIGN_UP"
  | "SUBSCRIBE"
  | "DOWNLOAD"
  | "GET_QUOTE"
  | "CONTACT_US"
  | "APPLY_NOW"
  | "ORDER_NOW"
  | "BOOK_TRAVEL";

export type WizardLaunchResult = {
  platform: string;
  state: "live" | "draft" | "requires_action" | "failed";
  externalCampaignId: string | null;
  reason: string;
  remediation: { label: string; href: string } | null;
  adapterMode: "live" | "stub";
};

export type WizardLaunchOutcome = {
  campaignId: string;
  campaignName: string;
  rollupStatus: "DRAFT" | "SCHEDULED" | "LIVE" | "PAUSED" | "ARCHIVED";
  results: WizardLaunchResult[];
};

export type WizardState = {
  step: WizardStep;
  // DNA
  brandName: string;
  domain: string;
  dnaNotes: string;
  dnaResult?: Record<string, unknown>;
  // Plan
  objective: "SALES" | "LEADS" | "APP_INSTALLS" | "TRAFFIC" | "AWARENESS" | "ENGAGEMENT";
  monthlyBudget: number;
  platforms: string[];
  targetCpa?: number;
  targetRoas?: number;
  targetLocation: string;
  currency: string;
  planResult?: Record<string, unknown>;
  // Competitor
  competitorResult?: Record<string, unknown>;
  // Forecast
  forecastResult?: Record<string, unknown>;
  // Creative — required for any platform that needs an actual ad to deliver
  // (currently Meta; Google/TikTok/etc. will reuse most of these once their
  // adapters add full-pipeline launch support).
  creative: {
    metaPageId: string;
    metaPageName: string;
    metaPixelId: string;       // empty when objective doesn't need a pixel
    metaPixelName: string;
    landingUrl: string;
    headline: string;          // <= 40 chars (Meta truncates above this on most placements)
    primaryText: string;       // <= 125 chars on most placements; we don't enforce here
    description: string;       // optional <= 30 chars (link description)
    cta: CreativeCta;
    imageHash: string;         // returned by /act_X/adimages
    imagePreviewUrl: string;   // also returned, for in-wizard preview
    imageFilename: string;     // for display only
  };
  // Launch
  launchOutcome?: WizardLaunchOutcome;
  loading: boolean;
  setStep: (s: WizardStep) => void;
  update: (patch: Partial<WizardState>) => void;
  reset: () => void;
};

const INITIAL: Omit<WizardState, "setStep" | "update" | "reset"> = {
  step: "welcome",
  brandName: "",
  domain: "",
  dnaNotes: "",
  objective: "SALES",
  monthlyBudget: 5000,
  platforms: ["META", "GOOGLE"],
  targetLocation: "Worldwide",
  currency: "USD",
  creative: {
    metaPageId: "",
    metaPageName: "",
    metaPixelId: "",
    metaPixelName: "",
    landingUrl: "",
    headline: "",
    primaryText: "",
    description: "",
    cta: "LEARN_MORE",
    imageHash: "",
    imagePreviewUrl: "",
    imageFilename: "",
  },
  loading: false,
};

// Bump this when WizardState shape changes. Older persisted payloads are
// dropped on rehydrate rather than feeding partial/incompatible data into
// step components, which can crash the page during client hydration.
const STORE_VERSION = 6;

export const useWizard = create<WizardState>()(
  persist(
    (set) => ({
      ...INITIAL,
      setStep: (step) => set({ step }),
      update: (patch) => set(patch),
      reset: () => set(INITIAL),
    }),
    {
      name: "eiaaw-wizard",
      version: STORE_VERSION,
      migrate: () => INITIAL,
      partialize: (state) => {
        // Persist only data — never the in-flight `loading` flag, which can
        // get stuck `true` on a refresh during a request.
        const { loading: _loading, ...rest } = state;
        return rest as WizardState;
      },
    },
  ),
);

export const STEPS: { key: WizardStep; label: string }[] = [
  { key: "welcome", label: "Welcome" },
  { key: "dna", label: "Brand DNA" },
  { key: "plan", label: "Strategy" },
  { key: "competitor", label: "Competitors" },
  { key: "forecast", label: "Forecast" },
  { key: "creative", label: "Creative" },
  { key: "launch", label: "Launch" },
  { key: "done", label: "Live" },
];
