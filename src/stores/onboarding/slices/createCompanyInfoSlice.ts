import { StateCreator } from "zustand";

type CompanyInfo = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

type CompanyInfoSlice = {
  companyInfo: CompanyInfo;
  setCompanyInfo: (data: CompanyInfo) => void;
};

const initialState = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

const createCompanyInfoSlice: StateCreator<CompanyInfoSlice> = (set) => ({
  companyInfo: initialState,
  setCompanyInfo: (data) =>
    set((state) => ({ companyInfo: { ...state.companyInfo, ...data } })),
});

export default createCompanyInfoSlice;
export type { CompanyInfo, CompanyInfoSlice };
