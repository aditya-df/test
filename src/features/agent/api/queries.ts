import { useQuery } from "@tanstack/react-query";
import { getList } from "./fetchers";
import { getListParams } from "@/entities/agent/types";

export const agentsQueryKey = () => ["agents"] as const;
export const agentQueryKey = (id: string) => ["agents", id] as const;

export function useListQuery(obj: getListParams) {
  return useQuery({
    queryKey: agentsQueryKey(),
    queryFn: () => getList(obj),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
