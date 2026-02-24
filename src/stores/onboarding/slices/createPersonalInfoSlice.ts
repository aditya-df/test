import { StateCreator } from "zustand";
import { Data as dataUser } from "@/stores/users/model";

class PersonalInfo extends dataUser {}

type PersonalInfoSlice = {
  personalInfo: PersonalInfo;
  setPersonalInfo: (data: PersonalInfo) => void;
};

const initialState = {
  name: "",
  phone: "",
  address: "",
  surname: "",
  username: "",
};

const createPersonalInfoSlice: StateCreator<PersonalInfoSlice> = (set) => ({
  personalInfo: {
    ...initialState,
    isVerified: true,
    onboardingCompleted: false,
    id: ""
  },
  setPersonalInfo: (data) =>
    set((state) => ({ personalInfo: { ...state.personalInfo, ...data } })),
});

export default createPersonalInfoSlice;
export type { PersonalInfo, PersonalInfoSlice };
