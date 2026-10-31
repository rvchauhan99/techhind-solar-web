"use client";

import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";
import companyService from "@/services/companyService";
import mastersService from "@/services/mastersService";
import productService from "@/services/productService";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";

const FLOW_BUCKETS = [
  { value: "procurement_in", label: "Procurement IN" },
  { value: "procurement_out", label: "Procurement OUT" },
  { value: "sales_out", label: "Sales OUT" },
  { value: "sales_in", label: "Sales IN" },
  { value: "transfer", label: "Transfer" },
  { value: "production", label: "Production" },
  { value: "adjustment", label: "Adjustment" },
];

const SALES_CHANNELS = [
  { value: "", label: "All channels" },
  { value: "b2c", label: "B2C" },
  { value: "b2b", label: "B2B" },
];

export default function StockMovementFilters({ filters, onFiltersChange }) {
  const fc = (name, value) => onFiltersChange?.({ ...filters, [name]: value });

  const loadWarehouseOptions = async (q) => {
    const res = await companyService.listWarehouses();
    const data = res?.result ?? res?.data ?? res ?? [];
    const list = Array.isArray(data) ? data : [];
    const filtered = q
      ? list.filter((w) => (w.name || "").toLowerCase().includes((q || "").toLowerCase()))
      : list;
    return filtered.slice(0, 50).map((w) => ({ id: w.id, name: w.name }));
  };

  const loadProductTypeOptions = async (q) => {
    const res = await mastersService.getReferenceOptions("product_type.model");
    const data = res?.result ?? res?.data ?? res ?? [];
    const list = Array.isArray(data) ? data : [];
    const filtered = q
      ? list.filter((t) =>
          (t.name || t.label || "").toLowerCase().includes((q || "").toLowerCase())
        )
      : list;
    return filtered.slice(0, 50).map((t) => ({ id: t.id, name: t.name || t.label }));
  };

  const loadProductMakeOptions = async (q) => {
    const params = {};
    if (filters.product_type_id) params.product_type_id = filters.product_type_id;
    const res = await mastersService.getReferenceOptions("product_make.model", params);
    const data = res?.result ?? res?.data ?? res ?? [];
    const list = Array.isArray(data) ? data : [];
    const filtered = q
      ? list.filter((m) =>
          (m.name || m.label || "").toLowerCase().includes((q || "").toLowerCase())
        )
      : list;
    return filtered.slice(0, 50).map((m) => ({ id: m.id, name: m.name || m.label }));
  };

  const loadProductOptions = async (q) => {
    const res = await productService.getProducts({ q: q || "", limit: 30, page: 1 });
    const data = res?.result?.data ?? res?.result ?? res?.data ?? [];
    const list = Array.isArray(data) ? data : [];
    return list.map((p) => ({
      id: p.id,
      name: formatProductAutocompleteLabel(p) || p.product_name || String(p.id),
    }));
  };

  return (
    <div className="border-t border-slate-100 px-2 py-1.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
      <DateField
        label="From"
        name="start_date"
        value={filters.start_date || ""}
        onChange={(e) => fc("start_date", e.target.value || "")}
        size="small"
      />
      <DateField
        label="To"
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
        getOptionLabel={(o) => o?.name ?? ""}
        value={filters.warehouse_id ? { id: filters.warehouse_id } : null}
        onChange={(e, v) => fc("warehouse_id", v?.id ?? "")}
        placeholder="All warehouses"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="product_type_id"
        label="Product type"
        asyncLoadOptions={loadProductTypeOptions}
        getOptionLabel={(o) => o?.name ?? ""}
        value={filters.product_type_id ? { id: filters.product_type_id } : null}
        onChange={(e, v) =>
          onFiltersChange?.({
            ...filters,
            product_type_id: v?.id ?? "",
            product_make_id: "",
          })
        }
        placeholder="All types"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="product_make_id"
        label="Make"
        asyncLoadOptions={loadProductMakeOptions}
        getOptionLabel={(o) => o?.name ?? ""}
        value={filters.product_make_id ? { id: filters.product_make_id } : null}
        onChange={(e, v) => fc("product_make_id", v?.id ?? "")}
        placeholder="All makes"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="product_id"
        label="Product"
        asyncLoadOptions={loadProductOptions}
        getOptionLabel={(o) => o?.name ?? ""}
        value={filters.product_id ? { id: filters.product_id } : null}
        onChange={(e, v) => fc("product_id", v?.id ?? "")}
        placeholder="Search product…"
        size="small"
      />
      <Select
        label="Flow bucket"
        name="flow_bucket"
        value={filters.flow_bucket || ""}
        onChange={(e) => fc("flow_bucket", e.target.value || "")}
        size="small"
        displayEmpty
      >
        <MenuItem value="">All buckets</MenuItem>
        {FLOW_BUCKETS.map((b) => (
          <MenuItem key={b.value} value={b.value}>
            {b.label}
          </MenuItem>
        ))}
      </Select>
      <Select
        label="Sales channel"
        name="sales_channel"
        value={filters.sales_channel || ""}
        onChange={(e) => fc("sales_channel", e.target.value || "")}
        size="small"
        displayEmpty
      >
        {SALES_CHANNELS.map((c) => (
          <MenuItem key={c.value || "all"} value={c.value}>
            {c.label}
          </MenuItem>
        ))}
      </Select>
    </div>
  );
}
