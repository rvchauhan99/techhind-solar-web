"use client";

import { Box, Tooltip, Typography } from "@mui/material";

/** Compact clamped planner remarks for kanban/list cards; full text on hover. */
export default function PlannerRemarksSnippet({ text }) {
    const t = String(text ?? "").trim();
    if (!t) return null;
    return (
        <Tooltip title={t} placement="top" enterDelay={400}>
            <Box
                sx={{
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    wordBreak: "break-word",
                    mt: 0.25,
                }}
            >
                <Typography component="span" variant="caption" fontWeight={600} color="text.secondary">
                    Planner remarks:{" "}
                </Typography>
                <Typography component="span" variant="caption" color="text.secondary">
                    {t}
                </Typography>
            </Box>
        </Tooltip>
    );
}
