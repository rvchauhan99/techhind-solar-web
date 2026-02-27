import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors overflow-hidden rounded-full border border-transparent",
  {
    variants: {
      variant: {
        default: "bg-[#00823b]/10 text-[#00823b]",
        navy: "bg-[#1b365d]/10 text-[#1b365d]",
        accent: "bg-[#f37021]/10 text-[#f37021]",
        secondary: "bg-slate-100 text-slate-700",
        destructive: "bg-red-100 text-red-800",
        success: "bg-emerald-100 text-emerald-800",
        outline: "border border-slate-200 text-slate-700 bg-white",
        ghost: "text-slate-600 hover:bg-slate-100",
        link: "text-[#00823b] underline hover:no-underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ className, variant }))}
      {...props}
    />
  );
}

export { badgeVariants };
