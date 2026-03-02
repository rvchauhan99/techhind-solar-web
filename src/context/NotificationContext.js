"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getAccessToken } from "@/lib/authStorage";
import * as notificationApi from "@/services/notificationService";

export const NotificationContext = createContext(null);

const DEFAULT_PAGE_SIZE = 20;

function getSocketUrl() {
  if (typeof window === "undefined") return "";
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return base.replace(/\/api\/?$/, "").trim() || window.location.origin;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ module: null, is_read: null });
  const socketRef = useRef(null);
  const mountedRef = useRef(true);

  const loadInitial = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const [listRes, count] = await Promise.all([
        notificationApi.fetchNotifications({ page: 1, limit: DEFAULT_PAGE_SIZE }),
        notificationApi.fetchUnreadCount(),
      ]);
      if (!mountedRef.current) return;
      const data = listRes?.data ?? [];
      setNotifications(Array.isArray(data) ? data : []);
      setTotal(listRes?.total ?? 0);
      setTotalPages(listRes?.total_pages ?? 0);
      setPage(1);
      setUnreadCount(typeof count === "number" ? count : 0);
    } catch (err) {
      if (mountedRef.current) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const fetchMore = useCallback(
    async (opts = {}) => {
      const token = getAccessToken();
      if (!token) return;
      const nextPage = opts.page ?? page + 1;
      const useFilter = opts.module !== undefined || opts.is_read !== undefined ? opts : filter;
      setLoading(true);
      try {
        const listRes = await notificationApi.fetchNotifications({
          page: nextPage,
          limit: DEFAULT_PAGE_SIZE,
          module: useFilter.module ?? undefined,
          is_read: useFilter.is_read !== undefined && useFilter.is_read !== null ? useFilter.is_read : undefined,
        });
        if (!mountedRef.current) return;
        const data = listRes?.data ?? [];
        const totalVal = listRes?.total ?? 0;
        const totalPagesVal = listRes?.total_pages ?? 0;
        if (nextPage === 1) {
          setNotifications(Array.isArray(data) ? data : []);
        } else {
          setNotifications((prev) => [...prev, ...(Array.isArray(data) ? data : [])]);
        }
        setTotal(totalVal);
        setTotalPages(totalPagesVal);
        setPage(nextPage);
      } catch (err) {
        // keep existing list
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [page, filter]
  );

  const refetch = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const [listRes, count] = await Promise.all([
        notificationApi.fetchNotifications({
          page: 1,
          limit: DEFAULT_PAGE_SIZE * Math.max(1, page),
          module: filter.module ?? undefined,
          is_read: filter.is_read !== undefined && filter.is_read !== null ? filter.is_read : undefined,
        }),
        notificationApi.fetchUnreadCount(),
      ]);
      if (!mountedRef.current) return;
      const data = listRes?.data ?? [];
      setNotifications(Array.isArray(data) ? data : []);
      setTotal(listRes?.total ?? listRes?.result?.total ?? 0);
      setTotalPages(listRes?.total_pages ?? listRes?.result?.total_pages ?? 0);
      setUnreadCount(typeof count === "number" ? count : 0);
    } catch (err) {
      // keep state
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [page, filter]);

  const markRead = useCallback(async (id) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id || n.id === Number(id) ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      // ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      // ignore
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      await notificationApi.deleteNotification(id);
      const wasUnread = notifications.find((n) => n.id === id || n.id === Number(id))?.is_read === false;
      setNotifications((prev) => prev.filter((n) => n.id !== id && n.id !== Number(id)));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      // ignore
    }
  }, [notifications]);

  const setFilterAndRefetch = useCallback((newFilter) => {
    setFilter(newFilter);
    setPage(1);
    fetchMore({
      page: 1,
      module: newFilter.module ?? undefined,
      is_read: newFilter.is_read !== undefined && newFilter.is_read !== null ? newFilter.is_read : undefined,
    });
  }, [fetchMore]);

  const requestNotificationPermission = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;
    Notification.requestPermission();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadInitial();
    return () => {
      mountedRef.current = false;
    };
  }, [loadInitial]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || typeof window === "undefined") return;
    const url = getSocketUrl();
    if (!url) return;
    const socket = io(url, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.on("notification", (payload) => {
      if (!mountedRef.current) return;
      setNotifications((prev) => [payload, ...prev]);
      setUnreadCount((c) => c + 1);
      // Play notification sound (double-chime via Web Audio) — respects mute toggle
      try {
        const soundOn = typeof window !== "undefined"
          ? (window.__solarSoundEnabled !== false)
          : true;
        if (soundOn) {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const playTone = (freq, startTime, duration = 0.12) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = "sine";
            gain.gain.setValueAtTime(0.18, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
          };
          playTone(880, ctx.currentTime);
          playTone(660, ctx.currentTime + 0.14);
        }
      } catch (_) { }
      // Browser notification (if permitted and not already focused on app)
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const title = payload?.title || "New notification";
        const body = payload?.message || "";
        try {
          const n = new Notification(title, { body, tag: `notif-${payload?.id ?? Date.now()}`, requireInteraction: false });
          n.onclick = () => {
            window.focus();
            if (payload?.redirect_url) window.location.href = payload.redirect_url;
            n.close();
          };
        } catch (_) { }
      }
    });
    socket.on("connect_error", () => { });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    total,
    totalPages,
    page,
    filter,
    setFilter: setFilterAndRefetch,
    markRead,
    markAllRead,
    deleteNotification,
    fetchMore,
    refetch,
    requestNotificationPermission,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
