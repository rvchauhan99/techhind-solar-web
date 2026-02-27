"use client";

import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";
import { IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium outline-none transition-all disabled:pointer-events-none disabled:opacity-50 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[#00823b] text-white hover:bg-[#00662e] shadow-sm",
        outline: "border border-[#00823b] bg-white text-[#00823b] hover:bg-[#00823b]/5 shadow-sm",
        secondary: "bg-[#1b365d] text-white hover:bg-[#142847]",
        ghost: "hover:bg-slate-100 hover:text-slate-900 text-slate-700",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
        success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
        link: "text-[#00823b] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-6 px-2 text-xs rounded-md",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-10 px-6 rounded-md",
        icon: "h-9 w-9",
        "icon-xs": "h-6 w-6 rounded-md",
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  children,
  disabled,
  startIcon,
  endIcon,
  fullWidth,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button";
  const isDisabled = disabled ?? loading;
  const resolvedVariant = variant === "contained" ? "default" : variant;

  const content = loading ? (
    <span className="inline-flex items-center justify-center gap-1.5">
      <IconLoader2 className="size-4 animate-spin shrink-0" aria-hidden />
      {children != null && children !== "" ? (
        <span className="ml-1.5">{children}</span>
      ) : null}
    </span>
  ) : (
    <span className="inline-flex items-center justify-center gap-1.5">
      {startIcon ? <span className="-ml-0.5 shrink-0 [&>svg]:size-4" data-icon="inline-start">{startIcon}</span> : null}
      {children}
      {endIcon ? <span className="-mr-0.5 shrink-0 [&>svg]:size-4" data-icon="inline-end">{endIcon}</span> : null}
    </span>
  );

  return (
    <Comp
      {...props}
      data-slot="button"
      data-variant={resolvedVariant}
      data-size={size}
      className={cn(
        buttonVariants({ variant: resolvedVariant, size, className }),
        fullWidth && "w-full"
      )}
      disabled={isDisabled}
      aria-busy={loading}
    >
      {content}
    </Comp>
  );
}

export { buttonVariants };
