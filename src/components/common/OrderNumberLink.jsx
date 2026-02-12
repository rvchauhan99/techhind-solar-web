"use client";

import Typography from "@mui/material/Typography";
import { ORDER_LINK_MUI_SX } from "@/utils/orderLinkStyles";

export default function OrderNumberLink({
    value,
    onClick,
    title,
    suffix = "",
    sx = {},
    variant = "body2",
    fontWeight = 700,
    className,
}) {
    return (
        <Typography
            component="button"
            type="button"
            variant={variant}
            fontWeight={fontWeight}
            title={title ?? value ?? "-"}
            onClick={onClick}
            className={className}
            sx={{
                background: "none",
                border: 0,
                p: 0,
                m: 0,
                textAlign: "left",
                font: "inherit",
                ...ORDER_LINK_MUI_SX,
                ...sx,
            }}
        >
            {value || "-"}
            {suffix}
        </Typography>
    );
}

