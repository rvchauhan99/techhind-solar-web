"use client";

import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import companyService from "@/services/companyService";
import { getReferenceOptionsSearch } from "@/services/mastersService";

const DELIVERY_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "complete", label: "Complete" },
];

const ORDER_STATUSES = [
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "draft", label: "Draft" },
];

export default function DeliveryReportFilters({ filters, onFiltersChange }) {
  const fc = (name, value) => {
    onFiltersChange?.({ ...filters, [name]: value });
  };

  const loadWarehouseOptions = async (q) => {
    const res = await companyService.listWarehouses();
    const data = res?.result ?? res?.data ?? res ?? [];
    const list = Array.isArray(data) ? data : [];
    const filtered = q
      ? list.filter((w) =>
          (w.name || w.label || "").toLowerCase().includes((q || "").toLowerCase())
        )
      : list;
    return filtered.slice(0, 50).map((w) => ({ id: w.id, name: w.name ?? w.label }));
  };

  return (
    <div className="border-t border-slate-100 px-2 py-1.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
      <DateField
        label="Delivery From"
        name="start_date"
        value={filters.start_date || ""}
        onChange={(e) => fc("start_date", e.target.value || "")}
        size="small"
      />
      <DateField
        label="Delivery To"
        name="end_date"
        value={filters.end_date || ""}
        onChange={(e) => fc("end_date", e.target.value || "")}
        minDate={filters.start_date || undefined}
        size="small"
      />
      <AutocompleteField
        usePortal
        name="warehouse_id"
        label="Warehouse"
        asyncLoadOptions={loadWarehouseOptions}
        getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
        value={filters.warehouse_id ? { id: filters.warehouse_id } : null}
        onChange={(e, v) => fc("warehouse_id", v?.id ?? "")}
        placeholder="All warehouses"
        size="small"
      />
      <Input
        label="Order #"
        name="order_number"
        value={filters.order_number || ""}
        onChange={(e) => fc("order_number", e.target.value || "")}
        placeholder="Search order…"
        size="small"
      />
      <Input
        label="Customer"
        name="customer_name"
        value={filters.customer_name || ""}
        onChange={(e) => fc("customer_name", e.target.value || "")}
        placeholder="Customer name…"
        size="small"
      />
      <Input
        label="Challan #"
        name="challan_no"
        value={filters.challan_no || ""}
        onChange={(e) => fc("challan_no", e.target.value || "")}
        placeholder="Challan number…"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="delivery_status"
        label="Delivery Status"
        options={DELIVERY_STATUSES}
        getOptionLabel={(o) => o?.label ?? ""}
        value={
          filters.delivery_status
            ? DELIVERY_STATUSES.find((s) => s.value === filters.delivery_status) || null
            : null
        }
        onChange={(e, v) => fc("delivery_status", v?.value ?? "")}
        placeholder="All statuses"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="order_status"
        label="Order Status"
        options={ORDER_STATUSES}
        getOptionLabel={(o) => o?.label ?? ""}
        value={
          filters.order_status
            ? ORDER_STATUSES.find((s) => s.value === filters.order_status) || null
            : null
        }
        onChange={(e, v) => fc("order_status", v?.value ?? "")}
        placeholder="All order statuses"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="handled_by"
        label="Handled By"
        asyncLoadOptions={(q) =>
          getReferenceOptionsSearch("user.model", {
            q,
            limit: 20,
            status_in: "active,inactive",
          })
        }
        getOptionLabel={(o) => o?.label ?? o?.name ?? ""}
        value={filters.handled_by ? { id: filters.handled_by } : null}
        onChange={(e, v) => fc("handled_by", v?.id ?? "")}
        placeholder="All users"
        size="small"
      />
    </div>
  );
}
