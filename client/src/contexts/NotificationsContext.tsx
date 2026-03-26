/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getMyNotifications,
  markNotificationsRead,
  type AppNotification,
} from "@/api/notifications";
import { useAuth } from "./AuthContext";

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
}

const NotificationsContext =
  createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      const response = await getMyNotifications();
      setNotifications(Array.isArray(response.data?.notifications) ? response.data.notifications : []);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  const markAsRead = useCallback(async (ids: string[]) => {
    if (!ids.length) {
      return;
    }

    await markNotificationsRead(ids);
    setNotifications((current) =>
      current.map((notification) =>
        ids.includes(notification.id)
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refreshNotifications,
      markAsRead,
    }),
    [loading, markAsRead, notifications, refreshNotifications, unreadCount],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }

  return context;
}
