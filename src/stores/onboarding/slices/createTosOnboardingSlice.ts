import { StateCreator } from "zustand";

type TosOnboardingSlice = {
  acceptedTerms: boolean;
  setAcceptedTerms: (accepted: boolean) => void;
};

const createTosOnboardingSlice: StateCreator<TosOnboardingSlice> = (set) => ({
  acceptedTerms: false,
  setAcceptedTerms: (accepted) => set({ acceptedTerms: accepted }),
});

export default createTosOnboardingSlice;
export type { TosOnboardingSlice };
