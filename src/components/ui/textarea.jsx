import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 transition-colors outline-none focus:ring-2 focus:ring-[#00823b]/40 focus:border-[#00823b] placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 min-h-[72px]",
        className
      )}
      {...props}
    />
  );
}
