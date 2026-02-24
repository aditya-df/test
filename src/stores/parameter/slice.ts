import { StateCreator } from "zustand";
import { State } from "@/stores/basemodel";
import { Data } from "./model";
import { getData, postData, putData, deleteData } from "@/utils/utils";
import { Action } from "@/types";
import { getSession } from "next-auth/react";

const endpoint = "parameter";

const initialState = State.getInstance() as State<Data>;

export interface Slice extends State<Data>, Action<Data> { }

export const createSlice: StateCreator<Slice, [], [], Slice> = (set, get) => ({
  ...initialState,
  setSelectedData: (obj) => set(() => ({ selectedData: obj })),

  getList: async ({ offset, limit, filters } = { offset: 0, limit: 1 }): Promise<Data[]> => {
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };

    if (get().data.length > 0) return get().data;
    const result = await getData(
      `${process.env.NEXT_PUBLIC_API_URL_V2}/${endpoint}?page=${offset}&page_size=${limit}&filters=${filters}&ordering=-createdAt`,
      set,
      get,
      "data",
      true,
      header
    );
    return Array.isArray(result) ? result : [];
  },
  getDetail: async (id: string) => {
    return await getData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}/${id}`,
      set,
      get,
      "selectedData",
    );
  },
  create: async (obj: Data) => {
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };
    return await postData(
      `${process.env.NEXT_PUBLIC_API_URL_V2}/${endpoint}`,
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
      `${process.env.NEXT_PUBLIC_API_URL_V2}/${endpoint}/${obj.id}`,
      obj,
      set,
      get,
      header
    );
  },
  delete: async (id: string) => {
    return await deleteData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}/${id}`,
      id,
      set,
      get,
    );
  },
});
