import { create } from "zustand";
import { Slice, createSlice } from "./slice";

export const useStore = create<Slice>((...a) => ({
  ...createSlice(...a),
}));
