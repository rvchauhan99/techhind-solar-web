"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconExternalLink } from "@tabler/icons-react";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { Button } from "@/components/ui/button";
import B2bSalesOrderDetailsContent from "@/app/b2b-sales-orders/components/B2bSalesOrderDetailsContent";
import b2bSalesOrderService from "@/services/b2bSalesOrderService";

/**
 * Shared SO details side drawer for Sales Planning pages.
 * Usage: const { openOrderSidebar, sidebar } = useB2bSalesOrderSidebar();
 * Render `{sidebar}` once in the page tree.
 */
export function useB2bSalesOrderSidebar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const closeOrderSidebar = useCallback(() => {
    setOpen(false);
    setSelected(null);
    setOrderDetails(null);
  }, []);

  const openOrderSidebar = useCallback((row) => {
    if (!row?.id) return;
    setSelected({ id: row.id, order_no: row.order_no || row.active_pipeline_reference || null });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open || !selected?.id) return;
    let cancelled = false;
    setLoading(true);
    setOrderDetails(null);
    b2bSalesOrderService
      .getB2bSalesOrderById(selected.id)
      .then((res) => {
        if (cancelled) return;
        setOrderDetails(res?.result ?? res ?? null);
      })
      .catch(() => {
        if (!cancelled) setOrderDetails(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selected?.id]);

  const sidebar = (
    <DetailsSidebar
      open={open}
      onClose={closeOrderSidebar}
      title={
        selected?.order_no
          ? `Order ${selected.order_no}`
          : orderDetails?.order_no
            ? `Order ${orderDetails.order_no}`
            : "Order Details"
      }
      headerActions={
        selected?.id ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/b2b-sales-orders/view?id=${selected.id}`)}
          >
            <IconExternalLink className="size-4 mr-1" />
            Open full page
          </Button>
        ) : null
      }
    >
      <B2bSalesOrderDetailsContent
        order={orderDetails || selected}
        loading={loading}
      />
    </DetailsSidebar>
  );

  return { openOrderSidebar, closeOrderSidebar, sidebar, sidebarOpen: open };
}

export default useB2bSalesOrderSidebar;
