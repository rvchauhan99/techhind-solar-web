"use client";

import { Box, Typography, IconButton, Chip, Tooltip } from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CampaignIcon from "@mui/icons-material/Campaign";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CheckIcon from "@mui/icons-material/Check";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ── Relative time helper ─────────────────────────────────────────────────────
function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const sec = Math.floor((Date.now() - d) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

// ── Module config ─────────────────────────────────────────────────────────────
const MODULE_CONFIG = {
  lead: {
    icon: CampaignIcon,
    bg: "rgba(37,99,235,0.08)",
    iconColor: "#2563eb",
    chipColor: "#2563eb",
    chipBg: "rgba(37,99,235,0.10)",
    label: "Lead",
  },
  inquiry: {
    icon: AssignmentIcon,
    bg: "rgba(5,150,105,0.08)",
    iconColor: "#059669",
    chipColor: "#059669",
    chipBg: "rgba(5,150,105,0.10)",
    label: "Inquiry",
  },
  order: {
    icon: ShoppingCartIcon,
    bg: "rgba(234,88,12,0.08)",
    iconColor: "#ea580c",
    chipColor: "#ea580c",
    chipBg: "rgba(234,88,12,0.10)",
    label: "Order",
  },
};

// ── Validated redirect URL map ────────────────────────────────────────────────
// Ensures we always navigate to a real route regardless of what backend sends.
function resolveRedirectUrl(mod, referenceId, redirect_url) {
  // If the backend already sent a valid-looking path use it directly
  if (redirect_url && redirect_url.startsWith("/")) return redirect_url;

  // Fallback construction per module
  const id = referenceId;
  if (mod === "lead") return id ? `/marketing-leads/view?id=${id}` : "/marketing-leads";
  if (mod === "inquiry") return id ? `/inquiry/${id}` : "/inquiry";
  if (mod === "order") return id ? `/confirm-orders?order_id=${id}` : "/confirm-orders";
  return redirect_url || "/home";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotificationCard({ notification, onRead, onDismiss, compact = false }) {
  const router = useRouter();
  const [markingRead, setMarkingRead] = useState(false);

  const {
    id,
    title,
    message,
    module: mod,
    is_read,
    created_at,
    redirect_url,
    action_label,
    reference_id,
    reference_number,
  } = notification || {};

  const cfg = MODULE_CONFIG[mod] || MODULE_CONFIG.inquiry;
  const Icon = cfg.icon;
  const resolvedUrl = resolveRedirectUrl(mod, reference_id, redirect_url);

  const handleView = () => {
    if (!is_read && onRead) {
      onRead(id);
    }
    router.push(resolvedUrl);
  };

  const handleMarkRead = async (e) => {
    e.stopPropagation();
    if (is_read || markingRead) return;
    setMarkingRead(true);
    if (onRead) await onRead(id);
    setMarkingRead(false);
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    if (onDismiss) onDismiss(id);
  };

  return (
    <Box
      onClick={handleView}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.25,
        py: compact ? 0.875 : 1.125,
        px: compact ? 1.25 : 1.5,
        cursor: resolvedUrl ? "pointer" : "default",
        bgcolor: is_read ? "transparent" : "rgba(99,102,241,0.04)",
        borderBottom: "1px solid",
        borderColor: "divider",
        transition: "background 0.15s ease",
        position: "relative",
        "&:hover": resolvedUrl
          ? { bgcolor: is_read ? "rgba(0,0,0,0.025)" : "rgba(99,102,241,0.08)" }
          : {},
        // Left accent bar for unread
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "3px",
          bgcolor: is_read ? "transparent" : cfg.iconColor,
          borderRadius: "0 2px 2px 0",
        },
      }}
    >
      {/* Module icon badge */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "8px",
          bgcolor: cfg.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          mt: 0.125,
        }}
      >
        <Icon sx={{ fontSize: 16, color: cfg.iconColor }} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.25, flexWrap: "wrap" }}>
          <Chip
            label={cfg.label}
            size="small"
            sx={{
              height: 16,
              fontSize: "0.625rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: cfg.chipColor,
              bgcolor: cfg.chipBg,
              px: 0.25,
              "& .MuiChip-label": { px: 0.75 },
            }}
          />
          {reference_number && (
            <Typography
              component="span"
              sx={{ fontSize: "0.625rem", color: "text.disabled", fontFamily: "monospace" }}
            >
              {reference_number}
            </Typography>
          )}
        </Box>

        {/* Title */}
        <Typography
          variant="body2"
          sx={{
            fontSize: "0.8125rem",
            fontWeight: is_read ? 500 : 700,
            lineHeight: 1.35,
            color: is_read ? "text.secondary" : "text.primary",
            mb: 0.2,
          }}
        >
          {title || "Notification"}
        </Typography>

        {/* Message */}
        <Typography
          variant="body2"
          sx={{
            fontSize: "0.75rem",
            color: "text.secondary",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {message || ""}
        </Typography>

        {/* Footer: time + action */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.625, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "0.6875rem", color: "text.disabled", lineHeight: 1 }}>
            {formatRelativeTime(created_at)}
          </Typography>

          {resolvedUrl && (
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.25,
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: cfg.iconColor,
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {action_label || "View"}
              <OpenInNewIcon sx={{ fontSize: 10 }} />
            </Box>
          )}
        </Box>
      </Box>

      {/* Actions */}
      <Box
        sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25, flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {!is_read && (
          <Tooltip title="Mark as read" placement="left" arrow>
            <IconButton
              size="small"
              onClick={handleMarkRead}
              disabled={markingRead}
              sx={{
                p: 0.375,
                color: cfg.iconColor,
                "&:hover": { bgcolor: cfg.bg },
              }}
            >
              <CheckIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        )}
        {/* Unread dot */}
        {!is_read && (
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              bgcolor: cfg.iconColor,
              mt: is_read ? 0 : 0.25,
              boxShadow: `0 0 0 2px ${cfg.chipBg}`,
            }}
          />
        )}
      </Box>
    </Box>
  );
}
