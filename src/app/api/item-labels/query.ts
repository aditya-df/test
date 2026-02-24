import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getList,
  getDetail,
  createItem,
  updateItem,
  deleteItem,
} from "./repository";
import { getListParam, createParam, updateParam } from "./repository.param";

import { QUERY_ITEM_LABELS_KEY } from "@/constants/query.constant";

// Query hooks for server data
export const useListQuery = (params?: getListParam) => {
  return useQuery({
    queryKey: [QUERY_ITEM_LABELS_KEY, params],
    queryFn: async () => {
      const { data } = await getList(params);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useDetailQuery = (id: number) => {
  return useQuery({
    queryKey: [QUERY_ITEM_LABELS_KEY, id],
    queryFn: async () => {
      const { data } = await getDetail({ id });
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryData: createParam) => {
      const { data } = await createItem(categoryData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_ITEM_LABELS_KEY] });
    },
  });
};

export const useUpdateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryData: updateParam) => {
      const { data } = await updateItem(categoryData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_ITEM_LABELS_KEY] });
    },
  });
};

export const useDeleteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await deleteItem({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_ITEM_LABELS_KEY] });
    },
  });
};
