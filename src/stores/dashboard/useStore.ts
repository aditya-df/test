import { create } from "zustand";

interface DashboardState {
  onboardingGuideCompleted: boolean | null;
  setOnboardingGuideCompleted: (value: boolean) => void;
  fetchOnboardingGuideStatus: () => Promise<void>;
  updateOnboardingGuideStatus: (value: boolean) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  onboardingGuideCompleted: null,
  setOnboardingGuideCompleted: (value) =>
    set({ onboardingGuideCompleted: value }),
  fetchOnboardingGuideStatus: async () => {
    try {
      const response = await fetch("/api/dashboard/onboarding-guide");
      if (!response.ok) {
        throw new Error("Failed to fetch onboarding guide status");
      }
      const data = await response.json();
      set({ onboardingGuideCompleted: data.data.onboardingGuideCompleted });
    } catch (error) {
      console.error("Error fetching onboarding guide status:", error);
    }
  },
  updateOnboardingGuideStatus: async (value: boolean) => {
    try {
      const response = await fetch("/api/dashboard/onboarding-guide", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingGuideCompleted: value }),
      });
      if (!response.ok) {
        throw new Error("Failed to update onboarding guide status");
      }
      const data = await response.json();
      set({ onboardingGuideCompleted: data.data.onboardingGuideCompleted });
    } catch (error) {
      console.error("Error updating onboarding guide status:", error);
    }
  },
}));
