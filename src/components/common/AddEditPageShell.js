"use client";

import { useRouter } from "next/navigation";
import Container from "@/components/container";
import { Button } from "@/components/ui/button";
import { IconHome, IconList } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * Standard shell for add/edit form pages. Renders Container, header (title + Home + List buttons), and children.
 * Use for every add and edit page so all forms share the same structure and design.
 *
 * @param {string} title - Page title (e.g. "Add New Inquiry", "Edit Order")
 * @param {string} listHref - Link to list page (e.g. "/inquiry", "/order")
 * @param {string} listLabel - Label for list button (e.g. "Inquiry", "Order")
 * @param {React.ReactNode} children - Form or page content
 * @param {string} [className] - Optional class for the container
 */
export default function AddEditPageShell({
  title,
  listHref,
  listLabel,
  children,
  className,
}) {
  const router = useRouter();

  return (
    <Container className={cn("flex flex-col gap-4 min-h-full flex-1", className)}>
      <div className="flex justify-between items-center flex-shrink-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/home")}
          >
            <IconHome className="size-4" />
            Home
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push(listHref)}
          >
            <IconList className="size-4" />
            {listLabel}
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </Container>
  );
}
