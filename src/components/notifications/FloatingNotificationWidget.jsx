"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Badge, Box, Tooltip, IconButton } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNotifications } from "@/context/NotificationContext";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import { useRouter } from "next/navigation";

// ── Project theme ──────────────────────────────────────────────────────────
const NAVY = "#1b365d";
const NAVY_DK = "#0f1f3a";
const NAVY_MID = "#142847";
const GREEN = "#00823b";

// Module color map (matches NotificationCard)
const MODULE_COLORS = {
    inquiry: { bg: "#d1fae5", text: "#065f46", dot: "#10b981" },
    lead: { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
    order: { bg: "#ffedd5", text: "#9a3412", dot: "#f97316" },
    default: { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af" },
};

const MODULE_LABELS = {
    inquiry: "Inquiry",
    lead: "Lead",
    order: "Order",
};

// ── Snap positions ─────────────────────────────────────────────────────────
const MARGIN = 20;
const BTN = 54;

function nearestSnap(x, y, vw, vh) {
    const pts = [
        { x: MARGIN, y: MARGIN },
        { x: vw - BTN - MARGIN, y: MARGIN },
        { x: MARGIN, y: Math.round(vh / 2 - BTN / 2) },
        { x: vw - BTN - MARGIN, y: Math.round(vh / 2 - BTN / 2) },
        { x: MARGIN, y: vh - BTN - MARGIN },
        { x: vw - BTN - MARGIN, y: vh - BTN - MARGIN },
    ];
    return pts.reduce((best, p) =>
        Math.hypot(p.x - x, p.y - y) < Math.hypot(best.x - x, best.y - y) ? p : best
    );
}

const POS_KEY = "solar-notif-widget-pos";
const SOUND_KEY = "solar-notif-sound";
const TOAST_TTL = 30_000; // 30 s

function loadPos() {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(POS_KEY)); } catch { return null; }
}
function savePos(p) {
    try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

function playChime() {
    if (typeof window === "undefined") return;
    const enabled = localStorage.getItem(SOUND_KEY) !== "false";
    if (!enabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const play = (freq, when, duration) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = "sine"; o.frequency.setValueAtTime(freq, when);
            g.gain.setValueAtTime(0.18, when);
            g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
            o.start(when); o.stop(when + duration);
        };
        play(880, ctx.currentTime, 0.18);
        play(660, ctx.currentTime + 0.22, 0.22);
    } catch { /* noop */ }
}

// ── Individual toast card ──────────────────────────────────────────────────
function ToastCard({ toast, onDismiss, onOpen }) {
    const [progress, setProgress] = useState(100);
    const startRef = useRef(Date.now());
    const rafRef = useRef(null);

    useEffect(() => {
        const tick = () => {
            const elapsed = Date.now() - startRef.current;
            const remaining = Math.max(0, 100 - (elapsed / TOAST_TTL) * 100);
            setProgress(remaining);
            if (remaining > 0) { rafRef.current = requestAnimationFrame(tick); }
            else onDismiss(toast.id);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [toast.id, onDismiss]);

    const mod = (toast.module || "default").toLowerCase();
    const color = MODULE_COLORS[mod] || MODULE_COLORS.default;
    const label = MODULE_LABELS[mod] || mod;

    return (
        <Box
            sx={{
                position: "relative",
                width: 340,
                bgcolor: NAVY,
                borderRadius: "12px",
                border: `1px solid ${NAVY_MID}`,
                boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
                overflow: "hidden",
                animation: "toastSlideIn 0.32s cubic-bezier(.22,1,.36,1) both",
                mb: "10px",
                "&:hover .toast-progress": { animationPlayState: "paused" },
            }}
        >
            {/* Top color accent */}
            <Box sx={{ height: 3, bgcolor: GREEN, width: "100%" }} />

            {/* Body */}
            <Box sx={{ p: "12px 14px 10px" }}>
                {/* Header row */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: "6px" }}>
                    {/* Module badge */}
                    <Box sx={{
                        px: 1, py: "1px", borderRadius: "4px",
                        bgcolor: color.bg, color: color.text,
                        fontSize: "0.6rem", fontWeight: 700,
                        letterSpacing: "0.05em", textTransform: "uppercase",
                        flexShrink: 0, lineHeight: 1.6,
                    }}>
                        {label}
                    </Box>

                    {/* Reference number */}
                    {toast.reference_number && (
                        <Box sx={{
                            fontSize: "0.65rem", fontWeight: 600,
                            color: "rgba(255,255,255,0.45)",
                            fontFamily: "monospace",
                            flexShrink: 0,
                        }}>
                            #{toast.reference_number}
                        </Box>
                    )}

                    <Box sx={{ flex: 1 }} />

                    {/* Dismiss */}
                    <IconButton
                        size="small"
                        onClick={() => onDismiss(toast.id)}
                        sx={{
                            color: "rgba(255,255,255,0.4)",
                            padding: "2px",
                            "&:hover": { color: "white", bgcolor: "rgba(255,255,255,0.08)" },
                        }}
                    >
                        <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </Box>

                {/* Title */}
                <Box sx={{
                    fontSize: "0.8rem", fontWeight: 700, color: "white",
                    lineHeight: 1.35, mb: "3px",
                }}>
                    {toast.title || "New notification"}
                </Box>

                {/* Message */}
                <Box sx={{
                    fontSize: "0.72rem", color: "rgba(255,255,255,0.62)",
                    lineHeight: 1.45,
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                    mb: "8px",
                }}>
                    {toast.message}
                </Box>

                {/* Action row */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {toast.redirect_url && (
                        <Box
                            onClick={() => onOpen(toast)}
                            sx={{
                                display: "flex", alignItems: "center", gap: 0.5,
                                fontSize: "0.7rem", fontWeight: 600,
                                color: GREEN, cursor: "pointer",
                                "&:hover": { color: "#00a34a", textDecoration: "underline" },
                            }}
                        >
                            <OpenInNewIcon sx={{ fontSize: 12 }} />
                            {toast.action_label || "Open"}
                        </Box>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Box sx={{
                        fontSize: "0.6rem", color: "rgba(255,255,255,0.3)",
                        fontWeight: 500,
                    }}>
                        closes in {Math.ceil((progress / 100) * 30)}s
                    </Box>
                </Box>
            </Box>

            {/* Progress bar */}
            <Box sx={{ height: "3px", bgcolor: NAVY_MID }}>
                <Box sx={{
                    height: "100%",
                    bgcolor: GREEN,
                    width: `${progress}%`,
                    transition: "width 0.1s linear",
                }} />
            </Box>
        </Box>
    );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function FloatingNotificationWidget() {
    const { unreadCount: ctxUnreadCount, notifications, refetch } = useNotifications();

    // Derive unread count from the actual notifications list
    // (ctxUnreadCount only increments on new socket events, but pre-existing
    //  unread notifications loaded from the API won't be reflected otherwise)
    const unreadCount = React.useMemo(
        () => Math.max(
            ctxUnreadCount,
            notifications.filter(n => n.is_read === false).length
        ),
        [ctxUnreadCount, notifications]
    );
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(null);
    const [pulse, setPulse] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [toasts, setToasts] = useState([]);   // { id, ...notif }

    const prevUnread = useRef(0);
    const prevNotifId = useRef(null); // track by first notif id to avoid dupes
    const dragState = useRef(null);

    /* ── Init position ── */
    useEffect(() => {
        const vw = window.innerWidth, vh = window.innerHeight;
        const saved = loadPos();
        if (saved && saved.x >= 0 && saved.x <= vw - BTN && saved.y >= 0 && saved.y <= vh - BTN) {
            setPos(saved);
        } else {
            setPos({ x: vw - BTN - MARGIN, y: vh - BTN - 90 });
        }
    }, []);

    /* ── Detect new notification → toast + pulse + sound ── */
    useEffect(() => {
        if (unreadCount > prevUnread.current) {
            // New notification arrived
            setPulse(true);
            const t = setTimeout(() => setPulse(false), 2200);

            // Get the latest notification (first in list = newest)
            const latest = notifications?.[0];
            if (latest && latest.id !== prevNotifId.current) {
                prevNotifId.current = latest.id;

                // Play chime
                playChime();

                // Add to toast queue
                const toastItem = {
                    id: `toast-${Date.now()}-${latest.id}`,
                    ...latest,
                };
                setToasts(prev => [toastItem, ...prev].slice(0, 5)); // max 5 stacked
            }

            return () => clearTimeout(t);
        }
        prevUnread.current = unreadCount;
    }, [unreadCount, notifications]);

    /* ── Toast dismiss ── */
    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    /* ── Toast click → navigate and open panel ── */
    const openToast = useCallback((toast) => {
        dismissToast(toast.id);
        setOpen(true);
        if (toast.redirect_url) {
            router.push(toast.redirect_url);
        }
    }, [dismissToast, router]);

    /* ── Clamp on resize ── */
    useEffect(() => {
        const onResize = () => {
            const vw = window.innerWidth, vh = window.innerHeight;
            setPos(prev => prev ? {
                x: Math.max(MARGIN, Math.min(vw - BTN - MARGIN, prev.x)),
                y: Math.max(MARGIN, Math.min(vh - BTN - MARGIN, prev.y)),
            } : prev);
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    /* ── Drag – Pointer Events ── */
    const onPointerDown = useCallback((e) => {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragState.current = { offsetX: e.clientX - pos.x, offsetY: e.clientY - pos.y, moved: false };
        setDragging(true);
    }, [pos]);

    const onPointerMove = useCallback((e) => {
        if (!dragState.current) return;
        const vw = window.innerWidth, vh = window.innerHeight;
        const nx = Math.max(0, Math.min(vw - BTN, e.clientX - dragState.current.offsetX));
        const ny = Math.max(0, Math.min(vh - BTN, e.clientY - dragState.current.offsetY));
        if (Math.abs(nx - pos.x) > 4 || Math.abs(ny - pos.y) > 4) dragState.current.moved = true;
        setPos({ x: nx, y: ny });
    }, [pos]);

    const onPointerUp = useCallback(() => {
        if (!dragState.current) return;
        const { moved } = dragState.current;
        dragState.current = null;
        setDragging(false);

        if (!moved) {
            setOpen(prev => !prev);
            return;
        }

        const vw = window.innerWidth, vh = window.innerHeight;
        const snap = nearestSnap(pos.x, pos.y, vw, vh);
        setPos(snap);
        savePos(snap);
    }, [pos]);

    if (!pos) return null;

    const hasUnread = unreadCount > 0;

    return (
        <>
            {/* ── Toast stack (top-right, below navbar) ── */}
            <Box sx={{
                position: "fixed",
                top: 64,
                right: 16,
                zIndex: 1500,
                display: "flex",
                flexDirection: "column-reverse",
                alignItems: "flex-end",
                pointerEvents: "none",
                "& > *": { pointerEvents: "all" },
            }}>
                {toasts.map(toast => (
                    <ToastCard
                        key={toast.id}
                        toast={toast}
                        onDismiss={dismissToast}
                        onOpen={openToast}
                    />
                ))}
            </Box>

            {/* ── Floating draggable button ── */}
            <Box
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                sx={{
                    position: "fixed",
                    left: pos.x,
                    top: pos.y,
                    width: BTN,
                    height: BTN + 26,   // extra room for count pill below
                    zIndex: 1400,
                    userSelect: "none",
                    touchAction: "none",
                    cursor: dragging ? "grabbing" : "grab",
                    transition: dragging
                        ? "none"
                        : "left 0.24s cubic-bezier(.4,0,.2,1), top 0.24s cubic-bezier(.4,0,.2,1)",
                }}
            >
                {/* Pulse rings */}
                {pulse && !open && (
                    <>
                        <Box sx={{
                            position: "absolute", inset: -5, borderRadius: "50%",
                            border: `2px solid ${GREEN}`,
                            animation: "fwPulse1 1.4s ease-out infinite",
                            pointerEvents: "none",
                        }} />
                        <Box sx={{
                            position: "absolute", inset: -12, borderRadius: "50%",
                            border: `1.5px solid ${GREEN}`,
                            opacity: 0.5,
                            animation: "fwPulse2 1.4s ease-out 0.35s infinite",
                            pointerEvents: "none",
                        }} />
                    </>
                )}

                {/* Active-open ring */}
                {open && (
                    <Box sx={{
                        position: "absolute", inset: -3, borderRadius: "50%",
                        border: `2.5px solid ${GREEN}`,
                        pointerEvents: "none",
                    }} />
                )}

                <Tooltip
                    title={
                        open
                            ? "Close notifications"
                            : hasUnread
                                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                                : "Notifications"
                    }
                    arrow
                    placement="left"
                >
                    <Box
                        sx={{
                            width: BTN,
                            height: BTN,
                            borderRadius: "50%",
                            bgcolor: open ? NAVY_DK : NAVY,
                            border: `2px solid ${open ? GREEN : NAVY_MID}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: open
                                ? `0 0 0 4px rgba(0,130,59,0.18), 0 8px 28px rgba(0,0,0,0.45)`
                                : `0 4px 20px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.3)`,
                            transition: "all 0.22s ease",
                            "&:hover": {
                                bgcolor: open ? NAVY_DK : NAVY_MID,
                                boxShadow: `0 0 0 4px rgba(0,130,59,0.22), 0 8px 28px rgba(0,0,0,0.5)`,
                                border: `2px solid ${GREEN}`,
                            },
                        }}
                    >
                        {open ? (
                            <CloseIcon sx={{ color: "white", fontSize: 20, opacity: 0.9 }} />
                        ) : hasUnread ? (
                            <NotificationsActiveIcon
                                sx={{
                                    color: GREEN,
                                    fontSize: 22,
                                    filter: pulse ? `drop-shadow(0 0 5px ${GREEN})` : "none",
                                    animation: pulse ? "fwShake 0.5s ease" : "none",
                                    transition: "filter 0.3s ease",
                                }}
                            />
                        ) : (
                            <NotificationsIcon
                                sx={{ color: "rgba(255,255,255,0.65)", fontSize: 22 }}
                            />
                        )}
                    </Box>
                </Tooltip>

                {/* ── Count pill below circle ── */}
                <Box sx={{
                    position: "absolute",
                    top: BTN + 4,
                    left: "50%",
                    transform: "translateX(-50%)",
                    pointerEvents: "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                }}>
                    {/* Count badge */}
                    {!open && hasUnread && (
                        <Box sx={{
                            bgcolor: GREEN,
                            color: "white",
                            fontSize: "0.6rem",
                            fontWeight: 800,
                            lineHeight: 1,
                            px: "6px",
                            py: "3px",
                            borderRadius: "999px",
                            minWidth: 20,
                            textAlign: "center",
                            boxShadow: "0 2px 8px rgba(0,130,59,0.5)",
                            animation: pulse ? "fwCountPop 0.4s ease" : "none",
                        }}>
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </Box>
                    )}
                    {/* Label */}
                    <Box sx={{
                        fontSize: "0.48rem",
                        color: "rgba(0,0,0,0.28)",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                    }}>
                        {open ? "close" : hasUnread ? "unread" : "drag"}
                    </Box>
                </Box>
            </Box>

            {/* ── Notification panel ── */}
            <NotificationPanel open={open} onClose={() => setOpen(false)} />

            {/* ── Keyframes ── */}
            <style>{`
        @keyframes fwPulse1 {
          0%   { transform: scale(1);   opacity: 0.85; }
          100% { transform: scale(2.0); opacity: 0;    }
        }
        @keyframes fwPulse2 {
          0%   { transform: scale(1);   opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0;    }
        }
        @keyframes fwShake {
          0%   { transform: rotate(0deg);   }
          15%  { transform: rotate(-16deg); }
          35%  { transform: rotate(16deg);  }
          55%  { transform: rotate(-10deg); }
          75%  { transform: rotate(10deg);  }
          100% { transform: rotate(0deg);   }
        }
        @keyframes toastSlideIn {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fwCountPop {
          0%   { transform: scale(1);    }
          40%  { transform: scale(1.35); }
          70%  { transform: scale(0.9);  }
          100% { transform: scale(1);    }
        }
      `}</style>
        </>
    );
}
