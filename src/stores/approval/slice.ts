import { State } from "@/stores/basemodel";
import { Data } from "./model";
import { Action } from "@/types";
import { StateCreator } from "zustand";
import { getSession } from "next-auth/react";
import {
  getData,
  postData,
  putData,
  deleteData,
  objectToQueryString,
} from "@/utils/utils";

const endpoint = "approval-request";

const initialState = State.getInstance() as State<Data>;

export interface Slice extends State<Data>, Action<Data> { }

export const createSlice: StateCreator<Slice, [], [], Slice> = (set, get) => ({
  ...initialState,
  setSelectedData: (obj) => set(() => ({ selectedData: obj })),

  getList: async ({ offset, limit } = { offset: 0, limit: 10 }): Promise<Data[]> => {
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };

    const result = await getData(
      // `${process.env.NEXT_PUBLIC_API_URL_V2}/${endpoint}?${queryParams.toString()}`,
      `${process.env.NEXT_PUBLIC_API_URL_V2}/${endpoint}/list/pending?page=${offset}&page_size=${limit}&filters={}&ordering=-createdAt`,
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
      header
    );
  },
  makeCustomEndpointRequest: async ({ path, method, data, queryParams }) => {
    const auth = await getSession();
    const header: HeadersInit = {
      Authorization: `Bearer ${auth?.user.backendToken}`,
    };

    const baseUrl = `${process.env.NEXT_PUBLIC_API_URL_V2}/${endpoint}`;
    const queryString = objectToQueryString(queryParams || {});
    const fullUrl = `${baseUrl}/${path}${queryString}`;

    switch (method) {
      case "GET":
        return await getData(fullUrl, set, get, "customData", true, header);
      case "POST":
        return await postData(fullUrl, data, set, get, header);
      case "PUT":
        return await putData(fullUrl, data, set, get, header);
      case "DELETE":
        return await deleteData(fullUrl, data?.id, set, get, header);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  },
});
