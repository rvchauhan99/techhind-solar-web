"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import companyService from "@/services/companyService";
import mastersService from "@/services/mastersService";
import productService from "@/services/productService";
import { formatProductAutocompleteLabel, mapProductRowForOrderFilter } from "@/utils/productAutocompleteLabel";
import AutocompleteField from "@/components/common/AutocompleteField";
import { ORDER_STAGE_OPTIONS } from "@/components/common/OrderListFilterPanel";

const FILTER_KEYS = [
  "q",
  "customer_name",
  "consumer_no",
  "application_no",
  "reference_from",
  "mobile_number",
  "branch_id",
  "inquiry_source_id",
  "project_scheme_id",
  "handled_by",
  "channel_partner_id",
  "order_number",
  "order_date_from",
  "order_date_to",
  "current_stage_key",
  "capacity_kw_from",
  "capacity_kw_to",
  "solar_panel_id",
  "inverter_id",
];

const EMPTY_VALUES = Object.fromEntries(
  FILTER_KEYS.map((k) => [k, ""])
);

async function searchProductsByTypeCi(q, productTypeCi) {
  const res = await productService.getProducts({
    q: q?.trim() ? q.trim() : undefined,
    limit: 30,
    product_type_ci: productTypeCi,
    visibility: "active",
  });
  const payload = res?.result ?? res?.data ?? res;
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.map((row) => mapProductRowForOrderFilter(row));
}

export default function OrderListFilterDialog({
  open,
  onClose,
  values = {},
  onApply,
  onClear,
}) {
  const [branchOptions, setBranchOptions] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [localValues, setLocalValues] = useState(() => ({ ...EMPTY_VALUES, ...values }));

  useEffect(() => {
    if (open) {
      setLocalValues({ ...EMPTY_VALUES, ...values });
    }
  }, [open, values]);

  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    Promise.all([
      companyService.listBranches().then((r) => {
        const data = r?.result ?? r?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
      mastersService.getReferenceOptions("inquiry_source.model").then((r) => {
        const data = r?.result ?? r?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
      mastersService.getReferenceOptions("user.model", { status_in: "active,inactive" }).then((r) => {
        const data = r?.result ?? r?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    ])
      .then(([branches, sources, users]) => {
        setBranchOptions(branches);
        setSourceOptions(sources);
        setUserOptions(users);
      })
      .catch(() => {
        setBranchOptions([]);
        setSourceOptions([]);
        setUserOptions([]);
      })
      .finally(() => setLoadingOptions(false));
  }, [open]);

  const handleChange = useCallback((key, value) => {
    setLocalValues((prev) => ({ ...prev, [key]: value ?? "" }));
  }, []);

  const handleApply = useCallback(() => {
    const applied = { ...localValues };
    const from = String(applied.capacity_kw_from ?? "").trim();
    const to = String(applied.capacity_kw_to ?? "").trim();
    if (from && !to) applied.capacity_kw_to = from;
    onApply?.(applied);
    onClose?.();
  }, [localValues, onApply, onClose]);

  const handleClear = useCallback(() => {
    setLocalValues({ ...EMPTY_VALUES });
    onClear?.();
    onClose?.();
  }, [onClear, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Filter orders</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Input
            name="customer_name"
            label="Customer name"
            placeholder="Customer name"
            value={localValues.customer_name}
            onChange={(e) => handleChange("customer_name", e.target.value)}
            size="small"
            fullWidth
          />
          <Input
            name="mobile_number"
            label="Contact number"
            placeholder="Mobile number"
            value={localValues.mobile_number}
            onChange={(e) => handleChange("mobile_number", e.target.value)}
            size="small"
            fullWidth
          />
          <Input
            name="consumer_no"
            label="Consumer no"
            placeholder="Consumer no"
            value={localValues.consumer_no}
            onChange={(e) => handleChange("consumer_no", e.target.value)}
            size="small"
            fullWidth
          />
          <Input
            name="application_no"
            label="Application no"
            placeholder="Application no"
            value={localValues.application_no}
            onChange={(e) => handleChange("application_no", e.target.value)}
            size="small"
            fullWidth
          />
          <Input
            name="reference_from"
            label="Reference"
            placeholder="Reference"
            value={localValues.reference_from}
            onChange={(e) => handleChange("reference_from", e.target.value)}
            size="small"
            fullWidth
          />
          <Select
            name="branch_id"
            label="Branch"
            placeholder="All branches"
            value={localValues.branch_id}
            onChange={(e) => handleChange("branch_id", e.target.value)}
            size="small"
            fullWidth
            disabled={loadingOptions}
          >
            <MenuItem value="">All</MenuItem>
            {branchOptions.map((b) => (
              <MenuItem key={b.id} value={String(b.id)}>
                {b.name ?? b.label ?? b.id}
              </MenuItem>
            ))}
          </Select>
          <Select
            name="inquiry_source_id"
            label="Source"
            placeholder="All sources"
            value={localValues.inquiry_source_id}
            onChange={(e) => handleChange("inquiry_source_id", e.target.value)}
            size="small"
            fullWidth
            disabled={loadingOptions}
          >
            <MenuItem value="">All</MenuItem>
            {sourceOptions.map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.source_name ?? s.label ?? s.name ?? s.id}
              </MenuItem>
            ))}
          </Select>
          <Select
            name="handled_by"
            label="Handled By"
            placeholder="All users"
            value={localValues.handled_by}
            onChange={(e) => handleChange("handled_by", e.target.value)}
            size="small"
            fullWidth
            disabled={loadingOptions}
          >
            <MenuItem value="">All</MenuItem>
            {userOptions.map((u) => (
              <MenuItem key={u.id} value={String(u.id)}>
                {u.name ?? u.label ?? `User #${u.id}`}
              </MenuItem>
            ))}
          </Select>
          <Select
            name="current_stage_key"
            label="Order stage"
            placeholder="All stages"
            value={localValues.current_stage_key}
            onChange={(e) => handleChange("current_stage_key", e.target.value)}
            size="small"
            fullWidth
          >
            <MenuItem value="">All</MenuItem>
            {ORDER_STAGE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          <Input
            name="order_number"
            label="Order number"
            placeholder="Order number"
            value={localValues.order_number}
            onChange={(e) => handleChange("order_number", e.target.value)}
            size="small"
            fullWidth
          />
          <Input
            name="capacity_kw_from"
            label="Capacity from (kW)"
            placeholder="e.g. 3"
            type="number"
            inputProps={{ step: "any" }}
            value={localValues.capacity_kw_from}
            onChange={(e) => handleChange("capacity_kw_from", e.target.value)}
            onBlur={() => {
              setLocalValues((prev) => {
                const from = String(prev.capacity_kw_from ?? "").trim();
                const to = String(prev.capacity_kw_to ?? "").trim();
                if (from && !to) return { ...prev, capacity_kw_to: from };
                return prev;
              });
            }}
            size="small"
            fullWidth
          />
          <Input
            name="capacity_kw_to"
            label="Capacity to (kW)"
            placeholder="Leave empty to match “from”"
            type="number"
            inputProps={{ step: "any" }}
            value={localValues.capacity_kw_to}
            onChange={(e) => handleChange("capacity_kw_to", e.target.value)}
            size="small"
            fullWidth
          />
          <AutocompleteField
            usePortal={true}
            name="solar_panel_id"
            label="Solar panel"
            asyncLoadOptions={(q) => searchProductsByTypeCi(q, "panel")}
            getOptionLabel={(o) => o?.label ?? o?.name ?? formatProductAutocompleteLabel(o) ?? ""}
            resolveOptionById={async (id) => {
              try {
                const res = await productService.getProductById(id);
                const p = res?.result ?? res?.data ?? res;
                if (!p?.id) return null;
                return mapProductRowForOrderFilter(p);
              } catch {
                return null;
              }
            }}
            value={localValues.solar_panel_id ? { id: localValues.solar_panel_id } : null}
            onChange={(e, newValue) =>
              handleChange("solar_panel_id", newValue?.id != null ? String(newValue.id) : "")
            }
            placeholder="Search panel product…"
            size="small"
            fullWidth
          />
          <AutocompleteField
            usePortal={true}
            name="inverter_id"
            label="Inverter"
            asyncLoadOptions={(q) => searchProductsByTypeCi(q, "inverter")}
            getOptionLabel={(o) => o?.label ?? o?.name ?? formatProductAutocompleteLabel(o) ?? ""}
            resolveOptionById={async (id) => {
              try {
                const res = await productService.getProductById(id);
                const p = res?.result ?? res?.data ?? res;
                if (!p?.id) return null;
                return mapProductRowForOrderFilter(p);
              } catch {
                return null;
              }
            }}
            value={localValues.inverter_id ? { id: localValues.inverter_id } : null}
            onChange={(e, newValue) =>
              handleChange("inverter_id", newValue?.id != null ? String(newValue.id) : "")
            }
            placeholder="Search inverter…"
            size="small"
            fullWidth
          />
          <DateField
            name="order_date_from"
            label="Order date from"
            value={localValues.order_date_from}
            onChange={(e) => handleChange("order_date_from", e.target.value)}
            size="small"
            fullWidth
          />
          <DateField
            name="order_date_to"
            label="Order date to"
            value={localValues.order_date_to}
            onChange={(e) => handleChange("order_date_to", e.target.value)}
            size="small"
            fullWidth
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { FILTER_KEYS, EMPTY_VALUES };
