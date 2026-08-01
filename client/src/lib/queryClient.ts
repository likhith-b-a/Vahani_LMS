import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: {
      onError?: (error: unknown) => void;
    };
    mutationMeta: {
      onError?: (error: unknown) => void;
    };
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      query.meta?.onError?.(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      mutation.meta?.onError?.(error);
    },
  }),
});
