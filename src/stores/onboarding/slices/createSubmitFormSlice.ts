import { StateCreator } from "zustand";
import { PersonalInfoSlice } from "./createPersonalInfoSlice";
import { CompanyInfoSlice } from "./createCompanyInfoSlice";
import { useStore as useOrganizationStore } from "@/stores/organization/useStore";
import { useStore as useUserStore } from "@/stores/users/useStore";
import { useStore as useSendEmailStore } from "@/stores/sendMail/useStore";
import { Data } from "@/stores/sendMail/model";

type SubmitFormSlice = {
  isSubmitted: boolean;
  onSubmit: (isSubmitted: boolean) => void;
  submitForm: () => void;
};

const user_store = useUserStore.getState();
const organization = useOrganizationStore.getState();
const sendEmail = useSendEmailStore.getState();

const createSubmitFormSlice: StateCreator<SubmitFormSlice, [], []> = (
  set,
  get,
) => ({
  isSubmitted: false,
  onSubmit: (isSubmitted) => {
    // set((state) => ({ ...state, isSubmitted: !state.isSubmitted })),
    if (!isSubmitted) {
      get().submitForm();
    }
    set((state) => ({ ...state, isSubmitted: !state.isSubmitted }));
  },
  submitForm: async () => {
    try {
      const { personalInfo } = get() as unknown as PersonalInfoSlice;
      const { companyInfo } = get() as unknown as CompanyInfoSlice;
      user_store.create({ ...personalInfo, onboardingCompleted: true });
      organization.create(companyInfo);

      const combinedInfoAdmin: Omit<Data, "type"> & { type: string } = {
        name: personalInfo.name ?? "",
        phone: personalInfo.phone ?? "",
        address: personalInfo.address ?? "",
        surname: personalInfo.surname ?? "",
        username: personalInfo.username ?? "",
        type: "admin",
      };

      const combinedInfoUser: Omit<Data, "type"> & { type: string } = {
        name: personalInfo.name ?? "",
        phone: personalInfo.phone ?? "",
        address: personalInfo.address ?? "",
        surname: personalInfo.surname ?? "",
        username: personalInfo.username ?? "",
        type: "user",
      };

      alert("Successfully submitted organization data");
      sendEmail.create(combinedInfoUser);
      sendEmail.create(combinedInfoAdmin);
    } catch (error) {
      console.error("Failed to submit the form", error);
    }
  },
});

export default createSubmitFormSlice;
export type { SubmitFormSlice };
