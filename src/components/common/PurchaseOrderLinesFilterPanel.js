"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import supplierService from "@/services/supplierService";
import productService from "@/services/productService";
import companyService from "@/services/companyService";
import mastersService, { getReferenceOptionsSearch } from "@/services/mastersService";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";

export const PO_LINES_FILTER_KEYS = [
  "status",
  "po_number",
  "po_date_from",
  "po_date_to",
  "due_date_from",
  "due_date_to",
  "supplier_id",
  "ship_to_id",
  "product_type_id",
  "product_make_id",
  "product_id",
  "hsn_code",
  "include_closed",
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
  { value: "PARTIAL_RECEIVED", label: "Partial Received" },
  { value: "CLOSED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const EMPTY = Object.fromEntries(PO_LINES_FILTER_KEYS.map((k) => [k, ""]));

export default function PurchaseOrderLinesFilterPanel({
  values = {},
  onApply,
  onClear,
  onQuickSearch,
  q = "",
}) {
  const [open, setOpen] = useState(false);
  const [localValues, setLocalValues] = useState(() => ({ ...EMPTY, ...values }));
  const [quickSearch, setQuickSearch] = useState(q || "");
  const searchFeedbackTimerRef = useRef(null);
  const [isSearching, setIsSearching] = useState(false);
  const [productTypeOptions, setProductTypeOptions] = useState([]);
  const [productMakeOptions, setProductMakeOptions] = useState([]);
  const [selectedWarehouseName, setSelectedWarehouseName] = useState("");
  const [selectedProductName, setSelectedProductName] = useState("");

  useEffect(() => {
    setLocalValues((prev) => ({ ...EMPTY, ...values }));
  }, [values]);

  useEffect(() => {
    setQuickSearch(q ?? "");
  }, [q]);

  useEffect(() => {
    mastersService
      .getReferenceOptions("product_type.model")
      .then((res) => {
        const data = res?.result || res?.data || res || [];
        const options = Array.isArray(data) ? data.map((t) => ({ value: String(t.id), label: t.name || String(t.id) })) : [];
        setProductTypeOptions(options);
      })
      .catch(() => setProductTypeOptions([]));
  }, []);

  useEffect(() => {
    mastersService
      .getReferenceOptions("product_make.model")
      .then((res) => {
        const data = res?.result || res?.data || res || [];
        const options = Array.isArray(data) ? data.map((m) => ({ value: String(m.id), label: m.name || String(m.id) })) : [];
        setProductMakeOptions(options);
      })
      .catch(() => setProductMakeOptions([]));
  }, []);

  const productTypeById = useMemo(() => {
    const map = new Map();
    productTypeOptions.forEach((item) => map.set(String(item.value), item.label));
    return map;
  }, [productTypeOptions]);

  const productMakeById = useMemo(() => {
    const map = new Map();
    productMakeOptions.forEach((item) => map.set(String(item.value), item.label));
    return map;
  }, [productMakeOptions]);

  useEffect(() => {
    const wid = values.ship_to_id;
    if (wid == null || wid === "") {
      setSelectedWarehouseName("");
      return;
    }
    let ignore = false;
    companyService
      .listWarehouses()
      .then((res) => {
        if (ignore) return;
        const data = res?.result ?? res?.data ?? res ?? [];
        const list = Array.isArray(data) ? data : [];
        const found = list.find((w) => String(w.id) === String(wid));
        setSelectedWarehouseName(found?.name || found?.label || "");
      })
      .catch(() => {
        if (!ignore) setSelectedWarehouseName("");
      });
    return () => {
      ignore = true;
    };
  }, [values.ship_to_id]);

  useEffect(() => {
    const pid = values.product_id;
    if (pid == null || pid === "") {
      setSelectedProductName("");
      return;
    }
    let ignore = false;
    productService
      .getProductById(pid)
      .then((p) => {
        if (ignore) return;
        const row = p?.result ?? p;
        setSelectedProductName(formatProductAutocompleteLabel(row) || row?.product_name || "");
      })
      .catch(() => {
        if (!ignore) setSelectedProductName("");
      });
    return () => {
      ignore = true;
    };
  }, [values.product_id]);

  const selectedProductTypeName = useMemo(
    () => productTypeById.get(String(localValues.product_type_id || "")) || "",
    [productTypeById, localValues.product_type_id]
  );

  const loadWarehouseOptions = useCallback(async (sq) => {
    const res = await companyService.listWarehouses();
    const data = res?.result ?? res?.data ?? res ?? [];
    const list = Array.isArray(data) ? data : [];
    const qNorm = (sq || "").toLowerCase();
    const filtered = qNorm
      ? list.filter(
          (item) =>
            String(item?.name || "").toLowerCase().includes(qNorm) ||
            String(item?.label || "").toLowerCase().includes(qNorm)
        )
      : list;
    return filtered.slice(0, 50).map((item) => ({
      id: item.id,
      name: item.name || item.label || String(item.id),
    }));
  }, []);

  const loadProductOptions = useCallback(
    async (sq) => {
      const res = await productService.getProducts({
        q: sq || undefined,
        limit: 50,
        product_type_id: localValues.product_type_id || undefined,
        product_make_id: localValues.product_make_id || undefined,
      });
      const data = res?.result?.data || res?.data || [];
      const list = Array.isArray(data) ? data : [];
      return list.map((item) => ({
        ...item,
        id: item.id,
        product_name: item.product_name || item.name || String(item.id),
      }));
    },
    [localValues.product_type_id, localValues.product_make_id]
  );

  const handleChange = useCallback((key, value) => {
    setLocalValues((p) => ({ ...p, [key]: value ?? "" }));
  }, []);

  const setLocalBatch = useCallback((patch) => {
    setLocalValues((p) => ({ ...p, ...patch }));
  }, []);

  const activeCount = useMemo(
    () =>
      PO_LINES_FILTER_KEYS.filter((key) => {
        const v = values[key];
        return v != null && v !== "";
      }).length,
    [values]
  );

  const handleQuickSearchChange = (val) => {
    setQuickSearch(val);
    setIsSearching(true);
    if (searchFeedbackTimerRef.current) clearTimeout(searchFeedbackTimerRef.current);
    searchFeedbackTimerRef.current = setTimeout(() => setIsSearching(false), 500);
    onQuickSearch?.(val);
  };

  const summaryLabels = useMemo(() => {
    const labels = {
      status: "Status",
      po_number: "PO #",
      po_date_from: "PO date",
      due_date_from: "Due date",
      supplier_id: "Supplier",
      ship_to_id: "Warehouse",
      product_type_id: "Product type",
      product_make_id: "Product make",
      product_id: "Product",
      hsn_code: "HSN",
      include_closed: "Completed POs",
    };
    return PO_LINES_FILTER_KEYS.filter((key) => values[key] != null && values[key] !== "").map(
      (key) => labels[key] || key
    );
  }, [values]);

  return (
    <Card className="rounded-xl shadow-sm border-slate-200 bg-white mb-1.5 overflow-visible">
      <div className="flex flex-col sm:flex-row items-center gap-1.5 px-2 py-1 h-auto sm:h-10">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-50 transition-colors rounded-md border border-slate-200 focus:outline-none shrink-0 text-xs"
        >
          <IconFilter size={14} />
          <span className="font-semibold text-slate-700 uppercase tracking-tight">Filters</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1 leading-none">
              {activeCount}
            </Badge>
          )}
          {open ? <IconChevronUp size={14} className="text-slate-400" /> : <IconChevronDown size={14} className="text-slate-400" />}
        </button>

        <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-h-[22px]">
          {summaryLabels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-semibold bg-green-50 text-green-800 border border-green-200 whitespace-nowrap"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="w-full sm:w-72 relative shrink-0">
          <div
            className={`absolute left-2 top-1/2 -translate-y-1/2 ${isSearching ? "text-green-500" : "text-slate-400"}`}
          >
            {isSearching ? (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
            ) : (
              <IconSearch size={14} />
            )}
          </div>
          <input
            type="text"
            placeholder="PO #, product, supplier…"
            className="w-full h-8 pl-8 pr-7 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30"
            value={quickSearch}
            onChange={(e) => handleQuickSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (searchFeedbackTimerRef.current) clearTimeout(searchFeedbackTimerRef.current);
                handleQuickSearchChange(quickSearch);
              }
            }}
          />
          {quickSearch && (
            <button
              type="button"
              onClick={() => handleQuickSearchChange("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500"
            >
              <IconX size={12} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-2 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
          <Select
            name="status"
            label="PO status"
            value={localValues.status}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>

          <Select
            name="include_closed"
            label="Completed POs"
            value={localValues.include_closed}
            onChange={(e) => handleChange("include_closed", e.target.value)}
          >
            <MenuItem value="">Auto (all when no status)</MenuItem>
            <MenuItem value="true">Always include</MenuItem>
            <MenuItem value="false">Hide completed</MenuItem>
          </Select>

          <Input
            name="po_number"
            label="PO number contains"
            placeholder="PO #"
            value={localValues.po_number}
            onChange={(e) => handleChange("po_number", e.target.value)}
          />

          <DateField
            name="po_date_from"
            label="PO date from"
            value={localValues.po_date_from}
            onChange={(e) => handleChange("po_date_from", e.target?.value ?? "")}
          />
          <DateField
            name="po_date_to"
            label="PO date to"
            value={localValues.po_date_to}
            onChange={(e) => handleChange("po_date_to", e.target?.value ?? "")}
          />
          <DateField
            name="due_date_from"
            label="Due from"
            value={localValues.due_date_from}
            onChange={(e) => handleChange("due_date_from", e.target?.value ?? "")}
          />
          <DateField
            name="due_date_to"
            label="Due to"
            value={localValues.due_date_to}
            onChange={(e) => handleChange("due_date_to", e.target?.value ?? "")}
          />

          <AutocompleteField
            usePortal
            name="supplier_id"
            label="Supplier"
            options={[]}
            asyncLoadOptions={async (sq) => {
              const res = await supplierService.getSuppliers({ q: sq || undefined, limit: 20 });
              const data = res?.result?.data ?? res?.data ?? [];
              return Array.isArray(data) ? data : [];
            }}
            resolveOptionById={async (id) => {
              if (id == null || id === "") return null;
              const s = await supplierService.getSupplierById(id);
              const row = s?.result ?? s;
              return row ? { id: row.id, supplier_name: row.supplier_name, supplier_code: row.supplier_code } : null;
            }}
            getOptionLabel={(s) =>
              s?.supplier_name ? `${s.supplier_name}${s.supplier_code ? ` (${s.supplier_code})` : ""}` : String(s?.id ?? "")
            }
            value={localValues.supplier_id ? { id: localValues.supplier_id } : null}
            onChange={(e, v) => handleChange("supplier_id", v?.id ? String(v.id) : "")}
            placeholder="Search supplier…"
          />

          <AutocompleteField
            usePortal
            name="ship_to_id"
            label="Warehouse (ship-to)"
            size="small"
            options={[]}
            asyncLoadOptions={loadWarehouseOptions}
            resolveOptionById={async (id) => {
              if (id == null || id === "") return null;
              const res = await companyService.listWarehouses();
              const data = res?.result ?? res?.data ?? res ?? [];
              const list = Array.isArray(data) ? data : [];
              const w = list.find((x) => String(x.id) === String(id));
              return w ? { id: w.id, name: w.name || w.label || String(w.id) } : null;
            }}
            getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
            value={
              localValues.ship_to_id
                ? {
                    id: localValues.ship_to_id,
                    name: selectedWarehouseName || `Warehouse #${localValues.ship_to_id}`,
                  }
                : null
            }
            onChange={(e, v) => {
              const nextId = v?.id ?? "";
              handleChange("ship_to_id", nextId ? String(nextId) : "");
              setSelectedWarehouseName(v?.name ?? v?.label ?? "");
            }}
            placeholder="Search warehouse…"
          />

          <AutocompleteField
            usePortal
            name="product_type_id"
            label="Product type"
            size="small"
            asyncLoadOptions={(sq) => getReferenceOptionsSearch("product_type.model", { q: sq, limit: 20 })}
            referenceModel="product_type.model"
            getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
            value={
              localValues.product_type_id
                ? {
                    id: localValues.product_type_id,
                    name: productTypeById.get(String(localValues.product_type_id)) || String(localValues.product_type_id),
                  }
                : null
            }
            onChange={(e, v) => {
              const id = v?.id ?? v?.value ?? "";
              if (id) {
                setLocalBatch({
                  product_type_id: String(id),
                  product_make_id: "",
                  product_id: "",
                });
                setSelectedProductName("");
              } else {
                setLocalBatch({ product_type_id: "", product_make_id: "", product_id: "" });
                setSelectedProductName("");
              }
            }}
            placeholder="All types"
          />

          <AutocompleteField
            usePortal
            name="product_make_id"
            label="Product make"
            size="small"
            asyncLoadOptions={(sq) =>
              getReferenceOptionsSearch("product_make.model", {
                q: sq,
                limit: 20,
                product_type_id: localValues.product_type_id || undefined,
              })
            }
            referenceModel="product_make.model"
            getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
            value={
              localValues.product_make_id
                ? {
                    id: localValues.product_make_id,
                    name: productMakeById.get(String(localValues.product_make_id)) || String(localValues.product_make_id),
                  }
                : null
            }
            onChange={(e, v) => {
              const id = v?.id ?? v?.value;
              const typeId = v?.product_type_id;
              if (id != null && id !== "") {
                const next = { ...localValues, product_make_id: String(id), product_id: "" };
                if (typeId) next.product_type_id = String(typeId);
                setLocalValues(next);
                setSelectedProductName("");
              } else {
                setLocalBatch({ product_make_id: "", product_id: "" });
                setSelectedProductName("");
              }
            }}
            placeholder="All makes"
          />

          <AutocompleteField
            usePortal
            name="product_id"
            label="Product"
            size="small"
            options={[]}
            asyncLoadOptions={loadProductOptions}
            getOptionLabel={(o) => formatProductAutocompleteLabel(o) || o?.product_name || o?.name || ""}
            value={
              localValues.product_id
                ? {
                    id: localValues.product_id,
                    product_name: selectedProductName || `Product #${localValues.product_id}`,
                  }
                : null
            }
            onChange={(e, v) => {
              const nextId = v?.id ?? "";
              if (nextId) {
                const next = { ...localValues, product_id: String(nextId) };
                if (v?.product_type_id) next.product_type_id = String(v.product_type_id);
                if (v?.product_make_id) next.product_make_id = String(v.product_make_id);
                setLocalValues(next);
                setSelectedProductName(formatProductAutocompleteLabel(v) || v?.product_name || v?.name || "");
              } else {
                setLocalBatch({ product_id: "" });
                setSelectedProductName("");
              }
            }}
            placeholder={selectedProductTypeName ? `Search ${selectedProductTypeName}…` : "Search product…"}
          />

          <Input
            name="hsn_code"
            label="Line HSN contains"
            value={localValues.hsn_code}
            onChange={(e) => handleChange("hsn_code", e.target.value)}
          />

          <div className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-5 flex justify-end gap-1.5 pt-1 border-t border-slate-100">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onClear?.()}>
              Clear
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => onApply?.(localValues)}>
              Apply
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
