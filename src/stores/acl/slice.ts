import { StateCreator } from "zustand";
import { State } from "@/stores/basemodel";
import { Data } from "./model";
import { getData, postData, putData, deleteData } from "@/utils/utils";
import { Action } from "@/types";

const endpoint = "acl";

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

  getList: async ({ offset, limit, role } = { offset: 0, limit: 1 }): Promise<Data[]> => {
    let url = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}?offset=${offset}&limit=${limit}`;

    if (role && role !== 'all') {
      url += `&role=${role}`;
    }

    const result = await getData(url, set, get);

    // Ensure we always return an array
    return Array.isArray(result) ? result : [];
  },
  getDetail: async (id: string) => {
    return await getData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}/${id}`,
      set,
      get,
      "selectedData"
    );
  },
  create: async (obj: Data) => {
    return await postData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}`,
      obj,
      set,
      get
    );
  },
  update: async (obj: Data) => {
    return await putData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}/${obj.id}`,
      obj,
      set,
      get
    );
  },
  delete: async (id: string) => {
    return await deleteData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}/${id}`,
      id,
      set,
      get
    );
  },
});
