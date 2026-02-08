import { cn } from "@/lib/utils";

export default function Container({ children, className }) {
  return (
    <div
      className={cn(
        "container mx-auto max-w-screen-2xl px-4 md:px-0",
        className
      )}
    >
      {children}
    </div>
  );
}
