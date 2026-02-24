import { create } from "zustand";
import { createSlice, Slice } from "./slice";

export const useStore = create<Slice>((...a) => ({
  ...createSlice(...a),
}));
