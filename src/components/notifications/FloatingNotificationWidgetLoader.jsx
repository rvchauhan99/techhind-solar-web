"use client";

import dynamic from "next/dynamic";

// This thin Client Component wrapper is needed because `ssr: false`
// is not allowed in Server Components (Next.js 15+).
const FloatingNotificationWidget = dynamic(
    () => import("./FloatingNotificationWidget"),
    { ssr: false }
);

export default function FloatingNotificationWidgetLoader() {
    return <FloatingNotificationWidget />;
}
