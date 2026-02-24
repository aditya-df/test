import { StateCreator } from "zustand";
import { State } from "@/stores/basemodel";
import { Data } from "./model";
import {
  getData,
  putData,
  deleteData,
  postDataFormUpload,
} from "@/utils/utils";
import { ActionUpload } from "@/types";

const endpoint = "knowledge";

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

export interface Slice extends State<Data>, ActionUpload<Data> { }

export const createSlice: StateCreator<Slice, [], [], Slice> = (set, get) => ({
  ...initialState,

  setSelectedData: (obj) => set(() => ({ selectedData: obj })),

  getList: async ({ offset, limit } = { offset: 0, limit: 1000 }): Promise<Data[]> => {
    if (get().data.length > 0) return get().data;

    const result = await getData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}?page=${offset}&page_size=${limit}&filters={}&ordering=-createdAt`,
      set,
      get,
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
  create: async (obj: Data, file?: File) => {
    return await postDataFormUpload(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}`,
      obj,
      obj.extensionType || "",
      obj.description || "",
      "",
      file || null,
      set,
      get,
    );
  },
  update: async (obj: Data) => {
    return await putData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}/${obj.id}`,
      obj,
      set,
      get,
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
