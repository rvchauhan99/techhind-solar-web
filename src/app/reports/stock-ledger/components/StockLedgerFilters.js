"use client";

import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";
import productService from "@/services/productService";
import companyService from "@/services/companyService";
import mastersService from "@/services/mastersService";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";
import { TRANSACTION_TYPE_OPTIONS } from "@/utils/inventoryTransactionLabels";
import { FLOW_BUCKET_OPTIONS } from "@/utils/stockLedgerLinks";

const SALES_CHANNELS = [
  { value: "", label: "All channels" },
  { value: "b2c", label: "B2C" },
  { value: "b2b", label: "B2B" },
];

function bucketList(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function StockLedgerFilters({
  filters,
  onFiltersChange,
  productOption = null,
  warehouseOption = null,
  onProductOptionChange,
  onWarehouseOptionChange,
}) {
  const fc = (name, value) => {
    onFiltersChange?.({ ...filters, [name]: value });
  };

  const loadProductOptions = async (q) => {
    const res = await productService.getProducts({
      limit: 50,
      q: q || undefined,
      visibility: "all",
      product_type_id: filters.product_type_id || undefined,
    });
    const data = res?.result?.data || res?.data || [];
    const list = Array.isArray(data) ? data : [];
    return list.map((p) => ({
      ...p,
      id: p.id,
      product_name: p.product_name ?? p.name,
    }));
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

  const selectedBuckets = bucketList(filters.flow_bucket);
  const bucketValue = FLOW_BUCKET_OPTIONS.filter((o) => selectedBuckets.includes(o.value));

  return (
    <div className="border-t border-slate-100 px-2 py-1.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
      <DateField
        label="From *"
        name="start_date"
        value={filters.start_date || ""}
        onChange={(e) => fc("start_date", e.target.value || "")}
        size="small"
      />
      <DateField
        label="To *"
        name="end_date"
        value={filters.end_date || ""}
        onChange={(e) => fc("end_date", e.target.value || "")}
        minDate={filters.start_date || undefined}
        size="small"
      />
      <AutocompleteField
        usePortal
        name="product_id"
        label="Product"
        asyncLoadOptions={loadProductOptions}
        getOptionLabel={(o) => formatProductAutocompleteLabel(o)}
        value={productOption || (filters.product_id ? { id: filters.product_id } : null)}
        onChange={(e, v) => {
          onProductOptionChange?.(v || null);
          fc("product_id", v?.id ?? "");
        }}
        placeholder="All products"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="warehouse_id"
        label="Warehouse"
        asyncLoadOptions={loadWarehouseOptions}
        getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
        value={warehouseOption || (filters.warehouse_id ? { id: filters.warehouse_id } : null)}
        onChange={(e, v) => {
          onWarehouseOptionChange?.(v || null);
          fc("warehouse_id", v?.id ?? "");
        }}
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
        multiple
        name="flow_bucket"
        label="Flow bucket"
        options={FLOW_BUCKET_OPTIONS}
        getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
        value={bucketValue}
        onChange={(e, v) =>
          fc(
            "flow_bucket",
            (Array.isArray(v) ? v : [])
              .map((o) => o?.value)
              .filter(Boolean)
              .join(",")
          )
        }
        placeholder="All buckets"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="transaction_type"
        label="Transaction type"
        options={TRANSACTION_TYPE_OPTIONS}
        getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
        value={
          filters.transaction_type
            ? TRANSACTION_TYPE_OPTIONS.find((o) => o.value === filters.transaction_type) || null
            : null
        }
        onChange={(e, v) => fc("transaction_type", v?.value ?? "")}
        placeholder="All types"
        size="small"
      />
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
      <label className="flex items-end gap-1.5 pb-1.5 text-[11px] text-slate-700 cursor-pointer select-none">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-primary"
          checked={filters.shrinkage_only === "1"}
          onChange={(e) => fc("shrinkage_only", e.target.checked ? "1" : "")}
        />
        Shrinkage only (Damage / Loss)
      </label>
    </div>
  );
}
