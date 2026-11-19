/**
 * NotificationsContext: one shared notification list for the whole app.
 *
 * - Loads the list when a user logs in.
 * - Subscribes to Supabase Realtime, so new alerts appear instantly and the
 *   tab badge updates.
 * - Registers for push. If push isn't available (simulator, Expo Go on
 *   Android…), it shows a local banner for realtime alerts instead.
 * - Tapping a push/banner opens the related item.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Notifications from 'expo-notifications';

import { useAuth } from './AuthContext';
import {
  deleteNotification,
  fetchNotifications,
  markAllRead as markAllReadApi,
  markRead as markReadApi,
  registerForPush,
  showLocalBanner,
  subscribeToNotifications,
} from '../services/notifications';
import { supabase } from '../services/supabase';
import { openItem } from '../navigation/navigationRef';
import type { AppNotification } from '../types';

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [list, setNotifications] = useState<AppNotification[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null); // whose list is loaded
  const [error, setError] = useState<unknown>(null);
  // Derived values (no extra state to keep in sync):
  const notifications = useMemo(() => (userId ? list.filter((n) => n.user_id === userId) : []), [list, userId]);
  const loading = !!userId && loadedFor !== userId && error == null;
  const hasPushToken = useRef(false);

  // State is only updated inside the promise callbacks.
  const refresh = useCallback(async () => {
    if (!userId) return;
    await fetchNotifications().then(
      (fresh) => {
        setNotifications(fresh);
        setLoadedFor(userId);
        setError(null);
      },
      (err) => setError(err),
    );
  }, [userId]);

  // On login: load the list, register push, and subscribe to live updates.
  useEffect(() => {
    if (!userId) return;
    refresh();
    registerForPush(userId).then((token) => {
      hasPushToken.current = !!token;
    });

    const channel = subscribeToNotifications(userId, (n) => {
      setNotifications((list) => (list.some((x) => x.id === n.id) ? list : [n, ...list]));
      // With real push, the phone already shows a banner, so avoid a duplicate.
      if (!hasPushToken.current) showLocalBanner(n);
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  // Tapping a notification banner opens its item.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const itemId = response.notification.request.content.data?.itemId;
      if (typeof itemId === 'string') openItem(itemId);
    });
    return () => sub.remove();
  }, []);

  // Optimistic updates: change the UI first, roll back if the server says no.
  const markRead = useCallback(async (id: string) => {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markReadApi(id);
    } catch (err) {
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: false } : n)));
      throw err;
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const before = notifications;
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    try {
      await markAllReadApi(userId);
    } catch (err) {
      setNotifications(before);
      throw err;
    }
  }, [userId, notifications]);

  const remove = useCallback(async (id: string) => {
    const before = notifications;
    setNotifications((list) => list.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch (err) {
      setNotifications(before);
      throw err;
    }
  }, [notifications]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      loading,
      error,
      refresh,
      markRead,
      markAllRead,
      remove,
    }),
    [notifications, loading, error, refresh, markRead, markAllRead, remove],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
