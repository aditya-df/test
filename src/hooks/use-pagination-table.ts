import { useMemo, useState } from "react";

interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  totalItems: number;
}

export interface PaginationResult {
  // Current state
  currentPage: number;
  pageSize: number;

  // Pagination metadata
  totalPages: number;
  startIndex: number;
  endIndex: number;

  // Navigation methods
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;

  // Additional data
  pageSizeOptions: number[];
  canPreviousPage: boolean;
  canNextPage: boolean;

  // Helper method to get current page data
  getVisibleItems: <T>(items: T[]) => T[];
}

export const usePaginationTable = ({
  initialPage = 1,
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50, 100],
  totalItems,
}: PaginationOptions): PaginationResult => {
  // State for current page and page size
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Calculate total pages
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize]
  );

  // Ensure current page is within bounds when dependencies change
  useMemo(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Calculate pagination metadata
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Navigation methods
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const firstPage = () => {
    setCurrentPage(1);
  };

  const lastPage = () => {
    setCurrentPage(totalPages);
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    const newTotalPages = Math.ceil(totalItems / newPageSize);
    const newCurrentPage = Math.min(currentPage, newTotalPages);

    setPageSize(newPageSize);
    setCurrentPage(newCurrentPage);
  };

  // Helper method to get current page data
  const getVisibleItems = <T>(items: T[]): T[] => {
    return items.slice(startIndex, endIndex);
  };

  return {
    // Current state
    currentPage,
    pageSize,

    // Pagination metadata
    totalPages,
    startIndex,
    endIndex,

    // Navigation methods
    setCurrentPage,
    setPageSize: handlePageSizeChange,
    nextPage,
    previousPage,
    firstPage,
    lastPage,

    // Additional data
    pageSizeOptions,
    canPreviousPage: currentPage > 1,
    canNextPage: currentPage < totalPages,

    // Helper method
    getVisibleItems,
  };
};
