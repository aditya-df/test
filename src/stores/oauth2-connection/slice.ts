import { StateCreator } from "zustand";
import { State } from "@/stores/basemodel";
import { Data } from "./model";
import {
  getData,
  postData,
  deleteData,
  // updateData,
  putData,
} from "@/utils/utils";
import { Action } from "@/types";
import { getSession } from "next-auth/react";

const endpoint = "oauth/connection";

const initialState: State<Data> = {
  loading: false,
  success: false,
  error: false,
  errorData: null,

  data: [],
  selectedData: new Data(),

  offset: 0,
  limit: 10,
};

export interface Slice extends State<Data>, Action<Data> { }

export const createSlice: StateCreator<Slice, [], [], Slice> = (set, get) => ({
  ...initialState,

  setSelectedData: (obj) => set(() => ({ selectedData: obj })),

  getList: async (): Promise<Data[]> => {
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };

    const result = await getData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}`,
      set,
      get,
      "data",
      true,
      header
    );

    // Ensure we always return an array
    return Array.isArray(result) ? result : [];
  },

  getDetail: async (id: string) => {
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };
    return await getData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}?id=${id}`,
      set,
      get,
      "selectedData",
      false,
      header
    );
  },

  create: async (obj: Data) => {
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };
    console.log(header);
    return await postData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}`,
      obj,
      set,
      get,
      header
    );
  },

  update: async (obj: Data) => {
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };

    return await putData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}?id=${obj.id}`,
      obj,
      set,
      get,
      header
    );
  },

  delete: async (id: string) => {
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };

    return await deleteData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}?id=${id}`,
      id,
      set,
      get,
      header // pass headers
    );
  },
});
