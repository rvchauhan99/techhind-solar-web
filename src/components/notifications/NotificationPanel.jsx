"use client";

import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  Tabs,
  Tab,
  Tooltip,
  Skeleton,
  Snackbar,
  Alert,
  Fade,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useNotifications } from "@/context/NotificationContext";
import NotificationCard from "./NotificationCard";
import { useEffect, useRef, useState, useCallback } from "react";

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "inquiry", label: "🔍 Inquiries" },
  { value: "lead", label: "🎯 Leads" },
  { value: "order", label: "📦 Orders" },
];

// Sound preference key
const SOUND_KEY = "solar-notif-sound";

function getSoundPref() {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(SOUND_KEY);
  return val === null ? true : val === "true";
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <Box>
      {[1, 2, 3].map((i) => (
        <Box key={i} sx={{ px: 1.5, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", gap: 1.25 }}>
            <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: "8px", flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" height={12} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width="85%" height={14} />
              <Skeleton variant="text" width="65%" height={12} sx={{ mt: 0.5 }} />
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ tab }) {
  const messages = {
    all: { icon: "🔔", text: "You're all caught up!" },
    unread: { icon: "✅", text: "No unread notifications" },
    inquiry: { icon: "🔍", text: "No inquiry notifications" },
    lead: { icon: "🎯", text: "No lead notifications" },
    order: { icon: "📦", text: "No order notifications" },
  };
  const { icon, text } = messages[tab] || messages.all;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        py: 6,
        px: 2,
        color: "text.secondary",
      }}
    >
      <Typography sx={{ fontSize: 36, lineHeight: 1 }}>{icon}</Typography>
      <Typography variant="body2" sx={{ fontSize: "0.8125rem", fontWeight: 500 }}>
        {text}
      </Typography>
      <Typography variant="caption" color="text.disabled" textAlign="center">
        New notifications will appear here instantly
      </Typography>
    </Box>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function NotificationPanel({ open, onClose }) {
  const {
    notifications,
    unreadCount,
    loading,
    totalPages,
    page,
    filter,
    setFilter,
    markRead,
    markAllRead,
    deleteNotification,
    fetchMore,
    refetch,
    requestNotificationPermission,
  } = useNotifications();

  const [soundEnabled, setSoundEnabled] = useState(getSoundPref);
  const [markingAll, setMarkingAll] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const listRef = useRef(null);

  const currentTab = filter.module
    ? filter.module
    : filter.is_read === false
      ? "unread"
      : "all";

  const handleTabChange = (_, value) => {
    if (value === "all") setFilter({ module: null, is_read: null });
    else if (value === "unread") setFilter({ module: null, is_read: false });
    else setFilter({ module: value, is_read: null });
    // Scroll to top on tab change
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== "undefined") localStorage.setItem(SOUND_KEY, String(next));
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await markAllRead();
    setMarkingAll(false);
    setToastOpen(true);
  };

  const hasMore = page < totalPages;

  useEffect(() => {
    if (open && requestNotificationPermission) requestNotificationPermission();
  }, [open, requestNotificationPermission]);

  // Expose sound preference globally so NotificationContext can read it
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__solarSoundEnabled = soundEnabled;
    }
  }, [soundEnabled]);

  // Derive counts per tab for badge labels
  const unreadInquiry = notifications.filter((n) => n.module === "inquiry" && !n.is_read).length;
  const unreadLead = notifications.filter((n) => n.module === "lead" && !n.is_read).length;
  const unreadOrder = notifications.filter((n) => n.module === "order" && !n.is_read).length;

  const tabBadge = {
    all: unreadCount || null,
    unread: unreadCount || null,
    inquiry: unreadInquiry || null,
    lead: unreadLead || null,
    order: unreadOrder || null,
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{ backdrop: { sx: { backdropFilter: "blur(1px)" } } }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 400 },
            maxWidth: "100vw",
            display: "flex",
            flexDirection: "column",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
            borderLeft: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          },
        }}
      >
        {/* ── Header ── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.25,
            borderBottom: "1px solid",
            borderColor: "divider",
            flexShrink: 0,
            background: "linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(99,102,241,0.01) 100%)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "8px",
                bgcolor: "rgba(99,102,241,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <NotificationsNoneIcon sx={{ fontSize: 16, color: "#6366f1" }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, lineHeight: 1.2, color: "text.primary" }}>
                Notifications
              </Typography>
              {unreadCount > 0 && (
                <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary", lineHeight: 1 }}>
                  {unreadCount} unread
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title={soundEnabled ? "Mute notification sound" : "Enable notification sound"} arrow>
              <IconButton
                size="small"
                onClick={toggleSound}
                sx={{
                  p: 0.5,
                  color: soundEnabled ? "#6366f1" : "action.disabled",
                  bgcolor: soundEnabled ? "rgba(99,102,241,0.08)" : "transparent",
                  borderRadius: "6px",
                  "&:hover": { bgcolor: "rgba(99,102,241,0.12)" },
                }}
              >
                {soundEnabled ? (
                  <VolumeUpIcon sx={{ fontSize: 16 }} />
                ) : (
                  <VolumeOffIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title="Refresh" arrow>
              <IconButton
                size="small"
                onClick={refetch}
                disabled={loading}
                sx={{ p: 0.5, borderRadius: "6px", "&:hover": { bgcolor: "action.hover" } }}
              >
                <RefreshIcon sx={{ fontSize: 16, animation: loading ? "spin 1s linear infinite" : "none" }} />
              </IconButton>
            </Tooltip>

            {unreadCount > 0 && (
              <Tooltip title="Mark all as read" arrow>
                <span>
                  <Button
                    size="small"
                    startIcon={<DoneAllIcon sx={{ fontSize: 13 }} />}
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                    sx={{
                      fontSize: "0.6875rem",
                      textTransform: "none",
                      fontWeight: 600,
                      color: "#6366f1",
                      px: 1,
                      py: 0.375,
                      borderRadius: "6px",
                      minWidth: 0,
                      "&:hover": { bgcolor: "rgba(99,102,241,0.08)" },
                    }}
                  >
                    All read
                  </Button>
                </span>
              </Tooltip>
            )}

            <IconButton
              size="small"
              onClick={onClose}
              sx={{ p: 0.5, borderRadius: "6px", "&:hover": { bgcolor: "action.hover" } }}
              aria-label="Close notifications"
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* ── Tabs ── */}
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 38,
            borderBottom: "1px solid",
            borderColor: "divider",
            flexShrink: 0,
            bgcolor: "rgba(0,0,0,0.01)",
            "& .MuiTab-root": {
              minHeight: 38,
              py: 0,
              px: 1.5,
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "none",
              color: "text.secondary",
              "&.Mui-selected": { color: "#6366f1" },
            },
            "& .MuiTabs-indicator": { bgcolor: "#6366f1", height: 2 },
          }}
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  {tab.label}
                  {tabBadge[tab.value] > 0 && (
                    <Box
                      sx={{
                        minWidth: 16,
                        height: 16,
                        borderRadius: "8px",
                        bgcolor: currentTab === tab.value ? "#6366f1" : "rgba(99,102,241,0.15)",
                        color: currentTab === tab.value ? "white" : "#6366f1",
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        px: 0.5,
                      }}
                    >
                      {tabBadge[tab.value] > 99 ? "99+" : tabBadge[tab.value]}
                    </Box>
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>

        {/* ── Notification List ── */}
        <Box
          ref={listRef}
          sx={{ flex: 1, overflowY: "auto", py: 0, scrollBehavior: "smooth" }}
        >
          {loading && notifications.length === 0 ? (
            <LoadingSkeleton />
          ) : notifications.length === 0 ? (
            <EmptyState tab={currentTab} />
          ) : (
            <>
              {notifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onRead={markRead}
                  onDismiss={deleteNotification}
                  onClose={onClose}
                />
              ))}

              {/* Load more */}
              {hasMore && (
                <Box sx={{ px: 2, py: 1.5, textAlign: "center", borderTop: "1px solid", borderColor: "divider" }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => fetchMore()}
                    disabled={loading}
                    sx={{
                      fontSize: "0.75rem",
                      textTransform: "none",
                      fontWeight: 600,
                      borderColor: "divider",
                      color: "text.secondary",
                      borderRadius: "8px",
                      px: 2,
                      "&:hover": { borderColor: "#6366f1", color: "#6366f1" },
                    }}
                  >
                    {loading ? "Loading..." : "Load more"}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* ── Footer ── */}
        <Divider />
        <Box
          sx={{
            px: 2,
            py: 0.875,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            bgcolor: "rgba(0,0,0,0.01)",
          }}
        >
          <Typography sx={{ fontSize: "0.6875rem", color: "text.disabled" }}>
            Real-time · Socket connected
          </Typography>
          <Button
            size="small"
            sx={{
              fontSize: "0.6875rem",
              textTransform: "none",
              color: "text.secondary",
              px: 0.75,
              py: 0.25,
              minWidth: 0,
              "&:hover": { color: "#6366f1" },
            }}
            onClick={onClose}
          >
            Close
          </Button>
        </Box>
      </Drawer>

      {/* ── Mark all read success toast ── */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={2500}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={Fade}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setToastOpen(false)}
          sx={{ fontSize: "0.8125rem", borderRadius: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
        >
          All notifications marked as read
        </Alert>
      </Snackbar>

      {/* Global spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
