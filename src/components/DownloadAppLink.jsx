"use client"

import { IconBrandGooglePlay } from "@tabler/icons-react"
import { PLAY_STORE_APP_URL } from "@/lib/appStoreLinks"
import { cn } from "@/lib/utils"

export function DownloadAppLink({ className }) {
  return (
    <a
      href={PLAY_STORE_APP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 text-sm transition-colors",
        className
      )}
    >
      <IconBrandGooglePlay className="size-4 shrink-0" aria-hidden />
      Download App
    </a>
  )
}
