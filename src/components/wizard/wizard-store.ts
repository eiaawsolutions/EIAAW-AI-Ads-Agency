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
  loading: false,
};

export const useWizard = create<WizardState>()(
  persist(
    (set) => ({
      ...INITIAL,
      setStep: (step) => set({ step }),
      update: (patch) => set(patch),
      reset: () => set(INITIAL),
    }),
    { name: "eiaaw-wizard" },
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
