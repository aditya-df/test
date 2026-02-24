import { StateCreator } from "zustand";
import { State } from "@/stores/basemodel";
import { Data } from "./model";
import {
  getData,
  deleteData,
  postDataMultipart,
  convertToFormData,
  putDataMultipart,
} from "@/utils/utils";
import { Action } from "@/types";
import { getSession } from "next-auth/react";

const endpoint = "function_tool";

const initialState = State.getInstance() as State<Data>;

export interface Slice extends State<Data>, Action<Data> { }

export const createSlice: StateCreator<Slice, [], [], Slice> = (set, get) => ({
  ...initialState,
  setSelectedData: (obj) => set(() => ({ selectedData: obj })),

  getList: async ({ offset, limit } = { offset: 0, limit: 1 }): Promise<Data[]> => {
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };
    // if (get().data.length > 0) return get().data;

    const result = await getData(
      `${process.env.NEXT_PUBLIC_API_URL_V2}/${endpoint}?page=${offset}&page_size=${limit}&filters={}&ordering=-createdAt`,
      set,
      get,
      "data",
      true,
      header
    );

    return Array.isArray(result) ? result : [];
  },
  getDetail: async (id: string) => {
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };
    return await getData(
      `${process.env.NEXT_PUBLIC_API_URL_V2}/${endpoint}/${id}`,
      set,
      get,
      "selectedData",
      true,
      header
    );
  },
  create: async (obj: Data) => {
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };
    const formData = convertToFormData(obj);
    return await postDataMultipart(
      `${process.env.NEXT_PUBLIC_API_URL_V2}/${endpoint}`,
      formData,
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
    const formData = convertToFormData(obj);
    return await putDataMultipart(
      `${process.env.NEXT_PUBLIC_API_URL_V2}/${endpoint}/${obj.id}`,
      formData,
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
      `${process.env.NEXT_PUBLIC_API_URL_V2}/${endpoint}/${id}`,
      id,
      set,
      get,
      header
    );
  },
});
