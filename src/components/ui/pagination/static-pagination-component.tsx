import { useEffect, useMemo, useState } from "react";

import ReactPaginate from "react-paginate";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "../select";

import { usePaginationTable } from "@/hooks/use-pagination-table";
import { cn } from "@/utils/utils";

export const StaticPaginationComponent = ({
  items,
  children,
  className,
}: any) => {
  const paginationUserCard = usePaginationTable({
    totalItems: 0,
    initialPageSize: 5,
  });
  const [itemOffset, setItemOffset] = useState(0);

  const endOffset = itemOffset + paginationUserCard.pageSize;
  const currentItems = items.slice(itemOffset, endOffset);
  const pageCount = useMemo(() => {
    return Math.ceil(items.length / paginationUserCard.pageSize);
  }, [itemOffset]);

  const handlePageClick = (event: any) => {
    const newOffset =
      (event.selected * paginationUserCard.pageSize) % items.length;
    setItemOffset(newOffset);
  };

  const [width, setWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const pageRangeDisplayed = useMemo(() => {
    if (width < 1024) return 0;
    return 1;
  }, [width]);

  const marginPagesDisplayed = useMemo(() => {
    if (width < 1024) return 0;
    return 1;
  }, [width]);

  return (
    <section className={cn("space-y-3 flex flex-col overflow-auto", className)}>
      <div className="overflow-auto pr-1">{children({ currentItems })}</div>

      <section className="flex max-sm:flex-col justify-between md:items-center gap-y-2">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Showing {itemOffset + 1} to{" "}
            {endOffset > items.length ? items.length : endOffset} of{" "}
            {items.length}
          </div>

          {/* <div className="hidden max-sm:flex items-center space-x-2">
            <p className="text-sm font-medium">Page Size:</p>
            <Select
              value={paginationUserCard.pageSize.toString()}
              onValueChange={(value) => {
                // paginationUserCard.setPageSize(Number(value));
                handlePageClick({ selected: 0 });
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={paginationUserCard.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {paginationUserCard.pageSizeOptions.map((size: any) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div> */}
        </div>

        <div className="flex max-sm:flex-col gap-x-4 gap-y-2">
          {/* <div className="max-sm:hidden flex items-center space-x-2">
            <p className="text-sm font-medium">Page Size:</p>
            <Select
              value={paginationUserCard.pageSize.toString()}
              onValueChange={(value) => {
                paginationUserCard.setPageSize(Number(value));
                handlePageClick({ selected: 0 });
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={paginationUserCard.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {paginationUserCard.pageSizeOptions.map((size: any) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div> */}

          <ReactPaginate
            breakLabel="..."
            nextLabel="NEXT"
            onPageChange={handlePageClick}
            pageRangeDisplayed={pageRangeDisplayed}
            marginPagesDisplayed={marginPagesDisplayed}
            pageCount={pageCount}
            previousLabel="PREV"
            renderOnZeroPageCount={null}
            className="flex gap-2 justify-end text-sm flex-wrap select-none"
            pageLinkClassName="border cursor-pointer aspect-square w-8 block flex items-center justify-center hover:shadow hover:bg-gray-100 transition-all rounded-md"
            activeLinkClassName="bg-gray-200 border-none !cursor-default"
            previousLinkClassName="border cursor-pointer px-3 py-1 block flex items-center justify-center rounded-md"
            nextLinkClassName="border cursor-pointer px-3 py-1 block flex items-center justify-center rounded-md"
            breakLinkClassName="border cursor-pointer aspect-square w-8 block flex items-center justify-center hover:shadow hover:bg-gray-100 transition-all rounded-md"
          />
        </div>
      </section>
    </section>
  );
};
