"use client";

import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import DateField from "@/components/common/DateField";
import productService from "@/services/productService";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";
import companyService from "@/services/companyService";

const SERIAL_STATUSES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "ISSUED", label: "Issued" },
  { value: "BLOCKED", label: "Blocked" },
];

const ISSUED_AGAINST_OPTIONS = [
  { value: "", label: "All" },
  { value: "customer_order", label: "Customer Order" },
  { value: "b2b_sales_order", label: "Sales Order" },
];

export default function ReportFilters({ filters, onFiltersChange, onApply, onReset }) {
  const fc = (name, value) => {
    const next = { ...filters, [name]: value };
    onFiltersChange?.(next);
  };

  const loadProductOptions = async (q) => {
    const res = await productService.getProducts({
      limit: 50,
      q: q || undefined,
      product_type_id: filters.product_type_id || undefined,
      product_make_id: filters.product_make_id || undefined,
      visibility: "all",
    });
    const data = res?.result?.data || res?.data || [];
    const list = Array.isArray(data) ? data : [];
    return list.map((p) => ({ ...p, id: p.id, product_name: p.product_name ?? p.name }));
  };

  const loadWarehouseOptions = async (q) => {
    const res = await companyService.listWarehouses();
    const data = res?.result ?? res?.data ?? res ?? [];
    const list = Array.isArray(data) ? data : [];
    const filtered = q
      ? list.filter(
          (w) =>
            (w.name || "").toLowerCase().includes((q || "").toLowerCase()) ||
            (w.label || "").toLowerCase().includes((q || "").toLowerCase())
        )
      : list;
    return filtered.slice(0, 50).map((w) => ({ id: w.id, name: w.name ?? w.label }));
  };

  return (
    <div className="border-t border-slate-100 px-2 py-1.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
      <DateField
        label="Inward Date From"
        name="start_date"
        value={filters.start_date || ""}
        onChange={(e) => fc("start_date", e.target.value || "")}
        size="small"
      />
      <DateField
        label="Inward Date To"
        name="end_date"
        value={filters.end_date || ""}
        onChange={(e) => fc("end_date", e.target.value || "")}
        minDate={filters.start_date || undefined}
        size="small"
      />
      <AutocompleteField
        usePortal
        name="product_type_id"
        label="Product Type"
        asyncLoadOptions={(q) => getReferenceOptionsSearch("product_type.model", { q, limit: 20 })}
        referenceModel="product_type.model"
        getOptionLabel={(o) => o?.label ?? o?.name ?? ""}
        value={filters.product_type_id ? { id: filters.product_type_id } : null}
        onChange={(e, v) => {
            const newTypeId = v?.id ?? "";
            if (filters.product_type_id !== newTypeId) {
                onFiltersChange?.({ ...filters, product_type_id: newTypeId, product_make_id: "", product_id: "" });
            } else {
                fc("product_type_id", newTypeId);
            }
        }}
        placeholder="All Product Types"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="product_make_id"
        label="Product Make"
        asyncLoadOptions={(q) => getReferenceOptionsSearch("product_make.model", { q, limit: 20, product_type_id: filters.product_type_id || undefined })}
        referenceModel="product_make.model"
        getOptionLabel={(o) => o?.label ?? o?.name ?? ""}
        value={filters.product_make_id ? { id: filters.product_make_id } : null}
        onChange={(e, v) => {
            const newMakeId = v?.id ?? "";
            const updates = { product_make_id: newMakeId };
            if (filters.product_make_id !== newMakeId) {
                updates.product_id = "";
            }
            if (newMakeId && v?.product_type_id) {
                updates.product_type_id = String(v.product_type_id);
            }
            onFiltersChange?.({ ...filters, ...updates });
        }}
        placeholder="All Makes"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="product_id"
        label="Product"
        asyncLoadOptions={loadProductOptions}
        getOptionLabel={(o) => formatProductAutocompleteLabel(o) || o?.product_name || o?.name || ""}
        value={filters.product_id ? { id: filters.product_id } : null}
        onChange={(e, v) => {
          const updates = { product_id: v?.id ?? "" };
          if (v?.id) {
            if (v.product_type_id) updates.product_type_id = String(v.product_type_id);
            if (v.product_make_id) updates.product_make_id = String(v.product_make_id);
          }
          onFiltersChange?.({ ...filters, ...updates });
        }}
        placeholder="Search product…"
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
        placeholder="Search warehouse…"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="status"
        label="Status"
        multiple
        options={SERIAL_STATUSES}
        getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
        value={(Array.isArray(filters.status) ? filters.status : [])
          .map((v) => SERIAL_STATUSES.find((s) => s.value === v))
          .filter(Boolean)}
        onChange={(e, v) => fc("status", v?.length ? v.map((o) => o.value) : null)}
        placeholder="All Statuses"
        size="small"
      />
      <Input
        name="serial_number"
        label="Serial Number"
        value={filters.serial_number || ""}
        onChange={(e) => fc("serial_number", e.target.value || "")}
        placeholder="Search serial…"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="issued_against"
        label="Issued Against"
        options={ISSUED_AGAINST_OPTIONS}
        getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
        value={
          ISSUED_AGAINST_OPTIONS.find((o) => o.value === (filters.issued_against ?? "")) ??
          ISSUED_AGAINST_OPTIONS[0]
        }
        onChange={(e, v) => fc("issued_against", v?.value ? v.value : "")}
        placeholder="All"
        size="small"
      />
      <Input
        name="reference_number"
        label="Reference Number"
        value={filters.reference_number || ""}
        onChange={(e) => fc("reference_number", e.target.value || "")}
        placeholder="Order / B2B order…"
        size="small"
      />
    </div>
  );
}
