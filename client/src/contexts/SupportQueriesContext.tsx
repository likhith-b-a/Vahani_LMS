/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import {
  useSupportQueriesState,
  type UseSupportQueriesOptions,
} from "@/hooks/useSupportQueries";

type SupportQueriesContextType = ReturnType<typeof useSupportQueriesState>;

const SupportQueriesContext = createContext<SupportQueriesContextType | null>(null);

interface SupportQueriesProviderProps extends UseSupportQueriesOptions {
  children: ReactNode;
}

export function SupportQueriesProvider({
  children,
  loadErrorTitle,
}: SupportQueriesProviderProps) {
  const value = useSupportQueriesState({ loadErrorTitle });

  useEffect(() => {
    void value.reloadQueries();
  }, [value.reloadQueries]);

  return (
    <SupportQueriesContext.Provider value={value}>
      {children}
    </SupportQueriesContext.Provider>
  );
}

export function useSupportQueries() {
  const context = useContext(SupportQueriesContext);
  if (!context) {
    throw new Error("useSupportQueries must be used within SupportQueriesProvider");
  }
  return context;
}
