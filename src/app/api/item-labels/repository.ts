import apiClient from "@/repositories/apiClient";
import {
  getListParam,
  getDetailParam,
  createParam,
  updateParam,
  deleteParam,
} from "./repository.param";
import { Data } from "./models";
import { PaginatedResponse } from "@/types/base-response.types";
import { QUERY_ITEM_LABELS_KEY } from "@/constants/query.constant";

export const getList = async ({
  page = 1,
  limit = 10,
  searchFieldName = "",
  searchQuery = "",
  orderByField = "createdAt",
  orderByDirection = "DESC",
}: getListParam = {}) => {
  const params = new URLSearchParams();

  params.append("page", page.toString());
  params.append("limit", limit.toString());

  if (searchFieldName) {
    params.append("searchFieldName", searchFieldName);
  }

  if (searchQuery) {
    params.append("searchQuery", searchQuery);
  }

  if (orderByField) {
    params.append("orderByField", orderByField);
  }

  if (orderByDirection) {
    params.append("orderByDirection", orderByDirection);
  }

  return await apiClient.get<PaginatedResponse<Data>>(
    `/${QUERY_ITEM_LABELS_KEY}?${params.toString()}`
  );
};

export const getDetail = async ({ id }: getDetailParam) => {
  return await apiClient.get<Data>(`/${QUERY_ITEM_LABELS_KEY}/${id}`);
};

export const createItem = async (params: createParam) => {
  return await apiClient.post(`/${QUERY_ITEM_LABELS_KEY}`, {
    ...params,
  });
};

export const updateItem = async (params: updateParam) => {
  return await apiClient.put(`/${QUERY_ITEM_LABELS_KEY}/${params.id}`, params);
};

export const deleteItem = async (params: deleteParam) => {
  return await apiClient.delete(`/${QUERY_ITEM_LABELS_KEY}/${params.id}`);
};
