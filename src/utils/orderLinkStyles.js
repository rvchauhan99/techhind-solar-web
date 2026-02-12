"use client";

export const ORDER_LINK_COLOR = "#16a34a";
export const ORDER_LINK_COLOR_HOVER = "#15803d";
export const ORDER_LINK_FOCUS_RING = "rgba(22, 163, 74, 0.35)";

export const ORDER_LINK_MUI_SX = {
    color: ORDER_LINK_COLOR,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    cursor: "pointer",
    "&:hover": {
        color: ORDER_LINK_COLOR_HOVER,
        textDecoration: "underline",
    },
    "&:focus-visible": {
        outline: `2px solid ${ORDER_LINK_FOCUS_RING}`,
        outlineOffset: "2px",
        borderRadius: "2px",
    },
};

export const ORDER_LINK_CLASS =
    "text-green-600 underline underline-offset-2 cursor-pointer hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/35 rounded-sm";

