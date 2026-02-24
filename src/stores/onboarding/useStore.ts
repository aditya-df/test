import { create } from "zustand";
import { PersonalInfoSlice } from "./slices/createPersonalInfoSlice";
import { PlanSlice } from "./slices/createPlanSlice";
import { AddOnSlice } from "./slices/createAddOnSlice";
import { ToggleSubcriptionPlanSlice } from "./slices/createToggleSubscriptionPlan";
import {
  createPersonalInfoSlice,
  createPlanSlice,
  createAddOnSlice,
  createToggleSubscriptionPlan,
  createStepSlice,
  createSubmitFormSlice,
  createCompanyInfoSlice,
} from "./slices";
import { StepSlice } from "./slices/createStepSlice";
import { SubmitFormSlice } from "./slices/createSubmitFormSlice";
import { CompanyInfoSlice } from "./slices/createCompanyInfoSlice";
import createTosOnboardingSlice, {
  TosOnboardingSlice,
} from "./slices/createTosOnboardingSlice";
// import createTosOnboardingSlice, { TosOnboardingSlice } from "./slices/createTosOnboardingSlice";

type NextButtonSlice = {
  isNextButtonDisabled: boolean;
  setNextButtonDisabled: (disabled: boolean) => void;
};

const useStore = create<
  PersonalInfoSlice &
    CompanyInfoSlice &
    PlanSlice &
    AddOnSlice &
    ToggleSubcriptionPlanSlice &
    StepSlice &
    SubmitFormSlice &
    TosOnboardingSlice &
    NextButtonSlice
>()((...a) => ({
  ...createPersonalInfoSlice(...a),
  ...createPlanSlice(...a),
  ...createAddOnSlice(...a),
  ...createToggleSubscriptionPlan(...a),
  ...createStepSlice(...a),
  ...createSubmitFormSlice(...a),
  ...createCompanyInfoSlice(...a),
  ...createTosOnboardingSlice(...a),
  isNextButtonDisabled: false,
  setNextButtonDisabled: (disabled) => a[0]({ isNextButtonDisabled: disabled }),
}));

export default useStore;
