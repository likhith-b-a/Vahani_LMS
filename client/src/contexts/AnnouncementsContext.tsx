/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import {
  useAnnouncementsState,
  type UseAnnouncementsOptions,
} from "@/hooks/useAnnouncements";

type AnnouncementsContextType = ReturnType<typeof useAnnouncementsState>;

const AnnouncementsContext = createContext<AnnouncementsContextType | null>(null);

interface AnnouncementsProviderProps extends UseAnnouncementsOptions {
  children: ReactNode;
}

export function AnnouncementsProvider({
  children,
  loadErrorTitle,
}: AnnouncementsProviderProps) {
  const value = useAnnouncementsState({ loadErrorTitle });

  useEffect(() => {
    void value.reloadAnnouncements();
  }, [value.reloadAnnouncements]);

  return (
    <AnnouncementsContext.Provider value={value}>
      {children}
    </AnnouncementsContext.Provider>
  );
}

export function useAnnouncements() {
  const context = useContext(AnnouncementsContext);
  if (!context) {
    throw new Error("useAnnouncements must be used within AnnouncementsProvider");
  }
  return context;
}
