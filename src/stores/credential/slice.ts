import { StateCreator } from "zustand";
import { State } from "@/stores/basemodel";
import { Data } from "./model";
import {
  getData,
  postDataMultipart,
  convertToFormData,
  putDataMultipart,
} from "@/utils/utils";
import { Action } from "@/types";

const endpoint = "credentials";

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

  getList: async ({ offset, limit } = { offset: 0, limit: 1 }): Promise<Data[]> => {
    const result = await getData(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}?offset=${offset}&limit=${limit}`,
      set,
      get,
    );

    // Ensure we always return an array
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
    const formData = convertToFormData(obj);
    return await postDataMultipart<Data>(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}`,
      formData,
      set,
      get,
    );
  },
  update: async (obj: Data) => {
    const formData = convertToFormData(obj);
    return await putDataMultipart(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}/${obj.id}`,
      formData,
      set,
      get,
    );
  },
  delete: async (id: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/${endpoint}/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        set(() => ({
          loading: false,
          error: true,
          errorData: {
            name: "Error",
            message:
              data.error || "An error occurred while deleting the datasource",
          },
        }));
        throw new Error(data.error || "Failed to delete datasource");
      }
      set((state) => ({
        loading: false,
        success: true,
        error: false,
        errorData: null,
        data: state.data.filter((item) => item.id !== id),
      }));
      return data;
    } catch (error) {
      set(() => ({
        loading: false,
        error: true,
        errorData: {
          name: "Error",
          message:
            error instanceof Error
              ? error.message
              : "An error occurred while deleting the datasource",
        },
      }));
      throw error;
    }
  },
});
