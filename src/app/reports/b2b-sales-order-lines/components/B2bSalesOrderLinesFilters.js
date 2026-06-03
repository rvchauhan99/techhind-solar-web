"use client";

import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import productService from "@/services/productService";
import companyService from "@/services/companyService";
import b2bClientService from "@/services/b2bClientService";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";

export const ORDER_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PARTIAL_SHIPPED", label: "Partial Shipped" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const LINE_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "PARTIAL", label: "Partial" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const mapList = (res) => {
  const data = res?.result?.data ?? res?.result ?? res?.data ?? res ?? [];
  return Array.isArray(data) ? data : [];
};

export default function B2bSalesOrderLinesFilters({ filters, onFiltersChange }) {
  const fc = (name, value) => onFiltersChange?.({ ...filters, [name]: value });

  const loadProductOptions = async (q) => {
    const res = await productService.getProducts({
      limit: 50,
      q: q || undefined,
      product_type_id: filters.product_type_id || undefined,
      product_make_id: filters.product_make_id || undefined,
      visibility: "all",
    });
    return mapList(res).map((p) => ({ ...p, id: p.id, product_name: p.product_name ?? p.name }));
  };

  const loadClientOptions = async (q) => {
    const res = await b2bClientService.getB2bClients({ q: q || undefined, limit: 50 });
    return mapList(res).map((c) => ({ ...c, id: c.id, name: c.client_name ?? c.name }));
  };

  const loadShipToOptions = async (q) => {
    const res = await b2bClientService.getB2bShipTos({
      q: q || undefined,
      client_id: filters.client_id || undefined,
      limit: 50,
    });
    return mapList(res).map((s) => ({ ...s, id: s.id, name: s.ship_to_name ?? s.name }));
  };

  const loadWarehouseOptions = async (q) => {
    const res = await companyService.listWarehouses();
    const list = mapList(res);
    const term = String(q || "").toLowerCase();
    return list
      .filter((w) => !term || String(w.name || w.label || "").toLowerCase().includes(term))
      .slice(0, 50)
      .map((w) => ({ ...w, id: w.id, name: w.name ?? w.label }));
  };

  const setProductHierarchy = (updates) => onFiltersChange?.({ ...filters, ...updates });

  return (
    <div className="border-t border-slate-100 px-2 py-1.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-1.5">
      <DateField
        label="Order From"
        name="order_date_from"
        value={filters.order_date_from || ""}
        onChange={(e) => fc("order_date_from", e.target.value || "")}
        size="small"
      />
      <DateField
        label="Order To"
        name="order_date_to"
        value={filters.order_date_to || ""}
        onChange={(e) => fc("order_date_to", e.target.value || "")}
        minDate={filters.order_date_from || undefined}
        size="small"
      />
      <AutocompleteField
        usePortal
        multiple
        name="status"
        label="Order Status"
        options={ORDER_STATUS_OPTIONS}
        getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
        value={(Array.isArray(filters.status) ? filters.status : [])
          .map((v) => ORDER_STATUS_OPTIONS.find((s) => s.value === v))
          .filter(Boolean)}
        onChange={(e, v) => fc("status", v?.length ? v.map((o) => o.value) : null)}
        placeholder="All"
        size="small"
      />
      <AutocompleteField
        usePortal
        multiple
        name="line_fulfillment_status"
        label="Line Status"
        options={LINE_STATUS_OPTIONS}
        getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
        value={(Array.isArray(filters.line_fulfillment_status) ? filters.line_fulfillment_status : [])
          .map((v) => LINE_STATUS_OPTIONS.find((s) => s.value === v))
          .filter(Boolean)}
        onChange={(e, v) => fc("line_fulfillment_status", v?.length ? v.map((o) => o.value) : null)}
        placeholder="All"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="client_id"
        label="Client"
        asyncLoadOptions={loadClientOptions}
        getOptionLabel={(o) => o?.client_name ?? o?.name ?? ""}
        value={filters.client_id ? { id: filters.client_id } : null}
        onChange={(e, v) => setProductHierarchy({ client_id: v?.id ?? "", ship_to_id: "" })}
        placeholder="Search client"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="ship_to_id"
        label="Ship To"
        asyncLoadOptions={loadShipToOptions}
        getOptionLabel={(o) => o?.ship_to_name ?? o?.name ?? ""}
        value={filters.ship_to_id ? { id: filters.ship_to_id } : null}
        onChange={(e, v) => fc("ship_to_id", v?.id ?? "")}
        placeholder="Search ship-to"
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
        placeholder="Search warehouse"
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
        onChange={(e, v) => setProductHierarchy({ product_type_id: v?.id ?? "", product_make_id: "", product_id: "" })}
        placeholder="All types"
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
          const updates = { product_make_id: v?.id ?? "", product_id: "" };
          if (v?.product_type_id) updates.product_type_id = String(v.product_type_id);
          setProductHierarchy(updates);
        }}
        placeholder="All makes"
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
          if (v?.product_type_id) updates.product_type_id = String(v.product_type_id);
          if (v?.product_make_id) updates.product_make_id = String(v.product_make_id);
          setProductHierarchy(updates);
        }}
        placeholder="Search product"
        size="small"
      />
      <AutocompleteField
        usePortal
        name="user_id"
        label="Created By"
        asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20, status_in: "active,inactive" })}
        referenceModel="user.model"
        getOptionLabel={(o) => o?.label ?? o?.name ?? ""}
        value={filters.user_id ? { id: filters.user_id } : null}
        onChange={(e, v) => fc("user_id", v?.id ?? "")}
        placeholder="All users"
        size="small"
      />
      <Input name="order_no" label="Order No" value={filters.order_no || ""} onChange={(e) => fc("order_no", e.target.value || "")} size="small" />
      <Input name="model_number" label="Model No" value={filters.model_number || ""} onChange={(e) => fc("model_number", e.target.value || "")} size="small" />
      <Input name="hsn_code" label="HSN" value={filters.hsn_code || ""} onChange={(e) => fc("hsn_code", e.target.value || "")} size="small" />
      <Input name="pending_quantity_from" label="Pending Qty From" type="number" value={filters.pending_quantity_from || ""} onChange={(e) => fc("pending_quantity_from", e.target.value || "")} size="small" />
      <Input name="pending_quantity_to" label="Pending Qty To" type="number" value={filters.pending_quantity_to || ""} onChange={(e) => fc("pending_quantity_to", e.target.value || "")} size="small" />
      <Input name="fulfillment_percent_from" label="Fulfill % From" type="number" value={filters.fulfillment_percent_from || ""} onChange={(e) => fc("fulfillment_percent_from", e.target.value || "")} size="small" />
      <Input name="fulfillment_percent_to" label="Fulfill % To" type="number" value={filters.fulfillment_percent_to || ""} onChange={(e) => fc("fulfillment_percent_to", e.target.value || "")} size="small" />
      <Input name="total_amount_from" label="Value From" type="number" value={filters.total_amount_from || ""} onChange={(e) => fc("total_amount_from", e.target.value || "")} size="small" />
      <Input name="total_amount_to" label="Value To" type="number" value={filters.total_amount_to || ""} onChange={(e) => fc("total_amount_to", e.target.value || "")} size="small" />
      <Input name="pending_value_from" label="Pending Value From" type="number" value={filters.pending_value_from || ""} onChange={(e) => fc("pending_value_from", e.target.value || "")} size="small" />
      <Input name="pending_value_to" label="Pending Value To" type="number" value={filters.pending_value_to || ""} onChange={(e) => fc("pending_value_to", e.target.value || "")} size="small" />
    </div>
  );
}
