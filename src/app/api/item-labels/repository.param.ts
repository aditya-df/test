export interface getListParam {
  page?: number;
  limit?: number;
  searchFieldName?: string; // comma-separated field names
  searchQuery?: string; // comma-separated search terms
  orderByField?: string;
  orderByDirection?: "ASC" | "DESC";
}

export interface getDetailParam {
  id: number;
}

export interface createParam {
  name: string;
  color: string;
  background_color: string;
}

export interface updateParam {
  id: number;
  name?: string;
  color?: string;
  background_color?: string;
}

export interface deleteParam {
  id: number;
}
