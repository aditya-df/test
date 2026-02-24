"use client";

import { Provider as JotaiProvider } from 'jotai';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function StateProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(new QueryClient());

  return (
    <JotaiProvider>
      <QueryClientProvider client={client}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </JotaiProvider>
  );
}