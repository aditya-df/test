import { StateCreator } from "zustand";
import { State } from "@/stores/basemodel";
import { Data } from "./model";
import {
  getData,
  postData,
  deleteData,
  // updateData,
  putData,
  objectToQueryString,
} from "@/utils/utils";
import { Action } from "@/types";
import { getSession } from "next-auth/react";

const endpoint = "organization";

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

  getList: async ({ offset, limit, queryParams } = { offset: 0, limit: 1 }): Promise<Data[]> => {
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };

    const queryString = objectToQueryString(queryParams || {});

    // Check if we already have data - you might want to remove this check for fresh data
    // if (get().data.length > 0) return get().data;

    // Convert offset to page number (offset is already calculated as (page-1)*pageSize in the component)
    // So we need to convert it back to page number: page = (offset / limit) + 1
    const page = Number(limit) > 0 ? Math.floor(offset / Number(limit)) + 1 : 1;

    const result = await getData(
      `${process.env.NEXT_PUBLIC_API_URL_V2}/${endpoint}${queryString ? `${queryString}&` : "?"
      }include=user&page=${page}&page_size=${limit}&filters={}&ordering=-createdAt`,
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
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };

    return await deleteData(
      `${process.env.NEXT_PUBLIC_API_URL_V2}/${endpoint}/${id}`,
      id,
      set,
      get,
      header // pass headers
    );
  },
});