"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WizardStep = "welcome" | "dna" | "plan" | "competitor" | "forecast" | "launch" | "done";

export type WizardState = {
  step: WizardStep;
  // DNA
  brandName: string;
  domain: string;
  dnaNotes: string;
  dnaResult?: Record<string, unknown>;
  // Plan
  objective: "SALES" | "LEADS" | "APP_INSTALLS" | "TRAFFIC" | "AWARENESS" | "ENGAGEMENT";
  monthlyBudgetUsd: number;
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
  monthlyBudgetUsd: 5000,
  platforms: ["META", "GOOGLE"],
  targetLocation: "Worldwide",
  currency: "USD",
  loading: false,
};

// Bump this when WizardState shape changes. Older persisted payloads are
// dropped on rehydrate rather than feeding partial/incompatible data into
// step components, which can crash the page during client hydration.
const STORE_VERSION = 3;

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
  { key: "launch", label: "Launch" },
  { key: "done", label: "Live" },
];
