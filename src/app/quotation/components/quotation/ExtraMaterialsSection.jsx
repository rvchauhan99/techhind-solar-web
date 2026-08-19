"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Box, Grid, Typography } from "@mui/material";
import Checkbox from "@/components/common/Checkbox";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import { Button } from "@/components/ui/button";
import quotationService from "@/services/quotationService";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";
import { toastError } from "@/utils/toast";

const COMPACT_FORM_SPACING = 0.5;

const EXTRA_MATERIALS_DETAILS_LABEL = "Additional Material";

const emptyRow = () => ({
  product_id: "",
  quantity: "",
  last_purchase_price: "",
  missing_price: false,
  profit_margin_percent: 0,
  gst_percent: 0,
  unit_excl: "",
  unit_incl: "",
  line_amount: "",
  warehouse_id: null,
  last_purchase_source: null,
});

const toNum = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v));

const roundMoney = (n) => Math.round((toNum(n) + Number.EPSILON) * 100) / 100;

export const computeExtraMaterialLine = ({
  lastPurchase,
  marginPercent,
  gstPercent,
  quantity,
}) => {
  const last = toNum(lastPurchase);
  const margin = toNum(marginPercent);
  const gst = toNum(gstPercent);
  const qty = toNum(quantity);
  if (!(last > 0)) {
    return { unit_excl: "", unit_incl: "", line_amount: "" };
  }
  const unitExcl = roundMoney(last * (1 + margin / 100));
  const unitIncl = roundMoney(unitExcl * (1 + gst / 100));
  const lineAmount = qty > 0 ? roundMoney(unitIncl * qty) : "";
  return { unit_excl: unitExcl, unit_incl: unitIncl, line_amount: lineAmount };
};

export const sumExtraMaterialsCost = (rows) => {
  if (!Array.isArray(rows)) return 0;
  return roundMoney(
    rows.reduce((sum, row) => sum + toNum(row?.line_amount), 0)
  );
};

const patchExtraCostIntoAmount2 = (cleanRows) => {
  const total = sumExtraMaterialsCost(cleanRows);
  return {
    extra_materials: cleanRows,
    additional_cost_details_2: EXTRA_MATERIALS_DETAILS_LABEL,
    additional_cost_amount_2: total > 0 ? total : "",
  };
};

export default function ExtraMaterialsSection({
  formData,
  products = [],
  patchForm,
  errors = {},
  showLastPurchase = false,
}) {
  const branchId = formData.branch_id;
  const enabled = !!formData.add_extra_materials;
  const rows = Array.isArray(formData.extra_materials) ? formData.extra_materials : [];
  const fetchSeqRef = useRef(0);

  const allowedProducts = useMemo(
    () =>
      (products || []).filter(
        (p) => p?.productType?.allow_in_extra_materials === true
      ),
    [products]
  );

  const setRows = useCallback(
    (nextRows) => {
      const clean = Array.isArray(nextRows) ? nextRows : [];
      patchForm(patchExtraCostIntoAmount2(clean));
    },
    [patchForm]
  );

  const applyPriceResultToRow = useCallback((row, priceItem) => {
    const margin = priceItem?.profit_margin_percent ?? row.profit_margin_percent ?? 0;
    const gst = priceItem?.gst_percent ?? row.gst_percent ?? 0;
    const missing = !!priceItem?.missing_price;
    let lastPurchase = row.last_purchase_price;
    if (!missing && priceItem?.last_purchase_price != null) {
      lastPurchase = priceItem.last_purchase_price;
    } else if (missing && row.last_purchase_source === "warehouse") {
      lastPurchase = "";
    } else if (missing && (lastPurchase === "" || lastPurchase == null) && priceItem?.last_purchase_price != null) {
      lastPurchase = priceItem.last_purchase_price;
    }

    const computed = computeExtraMaterialLine({
      lastPurchase: missing ? lastPurchase : priceItem?.last_purchase_price,
      marginPercent: margin,
      gstPercent: gst,
      quantity: row.quantity,
    });

    return {
      ...row,
      missing_price: missing,
      profit_margin_percent: margin,
      gst_percent: gst,
      warehouse_id: priceItem?.warehouse_id ?? row.warehouse_id ?? null,
      last_purchase_source: missing
        ? lastPurchase
          ? "manual"
          : null
        : "warehouse",
      last_purchase_price: missing
        ? lastPurchase ?? ""
        : priceItem?.last_purchase_price ?? "",
      ...computed,
    };
  }, []);

  const fetchPricesForRows = useCallback(
    async (currentRows, currentBranchId) => {
      if (!currentBranchId || !Array.isArray(currentRows) || currentRows.length === 0) {
        return currentRows;
      }
      const productIds = [
        ...new Set(
          currentRows
            .map((r) => Number(r.product_id))
            .filter((id) => Number.isInteger(id) && id > 0)
        ),
      ];
      if (productIds.length === 0) return currentRows;

      const seq = ++fetchSeqRef.current;
      try {
        const res = await quotationService.getExtraMaterialPrices({
          branch_id: currentBranchId,
          product_ids: productIds,
        });
        if (seq !== fetchSeqRef.current) return currentRows;
        const items = res?.result?.items ?? res?.data?.items ?? res?.items ?? [];
        const byId = new Map(items.map((it) => [Number(it.product_id), it]));
        return currentRows.map((row) => {
          const pid = Number(row.product_id);
          if (!Number.isInteger(pid) || pid <= 0) return row;
          const priceItem = byId.get(pid);
          if (!priceItem) return row;
          return applyPriceResultToRow(row, priceItem);
        });
      } catch (err) {
        if (seq !== fetchSeqRef.current) return currentRows;
        toastError(err?.response?.data?.message || err?.message || "Failed to fetch Extra Materials prices");
        return currentRows;
      }
    },
    [applyPriceResultToRow]
  );

  // Re-fetch when branch changes while Extra Materials enabled
  useEffect(() => {
    if (!enabled || !branchId || rows.length === 0) return;
    let cancelled = false;
    (async () => {
      const next = await fetchPricesForRows(rows, branchId);
      if (!cancelled) setRows(next);
    })();
    return () => {
      cancelled = true;
    };
    // Only re-run on branch change / enable toggle — not on every row edit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, enabled]);

  const handleToggle = (checked) => {
    if (!checked) {
      const details = String(formData.additional_cost_details_2 || "").trim();
      const wasExtraDriven =
        details === EXTRA_MATERIALS_DETAILS_LABEL || details === "Extra Materials Cost";
      patchForm({
        add_extra_materials: false,
        extra_materials: [],
        ...(wasExtraDriven
          ? { additional_cost_details_2: "", additional_cost_amount_2: "" }
          : {}),
      });
      return;
    }
    const nextRows = rows.length > 0 ? rows : [emptyRow()];
    patchForm({
      add_extra_materials: true,
      ...patchExtraCostIntoAmount2(nextRows),
    });
  };

  const handleRowChange = async (idx, patch) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    const row = next[idx];
    const productChanged = Object.prototype.hasOwnProperty.call(patch, "product_id");
    const qtyOrPriceChanged =
      Object.prototype.hasOwnProperty.call(patch, "quantity") ||
      Object.prototype.hasOwnProperty.call(patch, "last_purchase_price");

    if (productChanged && row.product_id && branchId) {
      setRows(next);
      const priced = await fetchPricesForRows([row], branchId);
      const pricedRow = priced[0] || row;
      const merged = next.map((r, i) => (i === idx ? pricedRow : r));
      setRows(merged);
      return;
    }

    if (qtyOrPriceChanged) {
      const computed = computeExtraMaterialLine({
        lastPurchase: row.last_purchase_price,
        marginPercent: row.profit_margin_percent,
        gstPercent: row.gst_percent,
        quantity: row.quantity,
      });
      next[idx] = {
        ...row,
        ...computed,
        last_purchase_source: row.missing_price
          ? row.last_purchase_price
            ? "manual"
            : null
          : row.last_purchase_source,
      };
    }
    setRows(next);
  };

  const handleAddRow = () => {
    setRows([...rows, emptyRow()]);
  };

  const handleRemoveRow = (idx) => {
    const next = rows.filter((_, i) => i !== idx);
    setRows(next.length > 0 ? next : [emptyRow()]);
  };

  return (
    <Box>
      <Grid container spacing={COMPACT_FORM_SPACING} sx={{ mb: 0.5 }}>
        <Grid item size={{ xs: 12, md: 4 }}>
          <Checkbox
            name="add_extra_materials"
            label="Add Extra Materials"
            checked={enabled}
            onChange={(e) => handleToggle(!!e.target.checked)}
          />
        </Grid>
      </Grid>

      {enabled && (
        <>
          {allowedProducts.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              No products available. Enable &quot;Allow in extra materials&quot; on Product Type in Masters.
            </Typography>
          )}
          {rows.map((row, idx) => {
            const productId = row.product_id;
            const selected =
              allowedProducts.find((p) => p.id == productId) ||
              (productId ? { id: productId } : null);
                    const lastPurchaseReadonly = !row.missing_price;
            return (
              <Grid container spacing={COMPACT_FORM_SPACING} key={`extra-mat-${idx}`} sx={{ mb: 0.5 }}>
                <Grid item size={{ xs: 12, md: 3 }}>
                  <AutocompleteField
                    fullWidth
                    name={`extra_materials_${idx}_product`}
                    label={idx === 0 ? "Product" : `Product ${idx + 1}`}
                    options={allowedProducts}
                    getOptionLabel={(p) => formatProductAutocompleteLabel(p)}
                    value={selected}
                    onChange={(e, newValue) =>
                      handleRowChange(idx, {
                        product_id: newValue?.id ?? "",
                        last_purchase_price: "",
                        missing_price: false,
                        unit_excl: "",
                        unit_incl: "",
                        line_amount: "",
                        last_purchase_source: null,
                      })
                    }
                    placeholder="Type to search..."
                    error={!!errors[`extra_materials_${idx}_product`]}
                    helperText={errors[`extra_materials_${idx}_product`] || ""}
                  />
                </Grid>
                <Grid item size={{ xs: 6, md: 1.5 }}>
                  <Input
                    fullWidth
                    type="number"
                    name={`extra_materials_${idx}_quantity`}
                    label="Qty"
                    value={row.quantity ?? ""}
                    onChange={(e) => handleRowChange(idx, { quantity: e.target.value ?? "" })}
                    error={!!errors[`extra_materials_${idx}_quantity`]}
                    helperText={errors[`extra_materials_${idx}_quantity`] || ""}
                  />
                </Grid>
                {showLastPurchase && (
                  <Grid item size={{ xs: 6, md: 2 }}>
                    <Input
                      fullWidth
                      type="number"
                      name={`extra_materials_${idx}_last_purchase`}
                      label="Last Purchase"
                      value={row.last_purchase_price ?? ""}
                      onChange={(e) =>
                        handleRowChange(idx, {
                          last_purchase_price: e.target.value ?? "",
                          missing_price: true,
                        })
                      }
                      InputProps={lastPurchaseReadonly ? { readOnly: true } : undefined}
                      disabled={lastPurchaseReadonly}
                      sx={
                        lastPurchaseReadonly
                          ? { "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } }
                          : undefined
                      }
                      error={!!errors[`extra_materials_${idx}_last_purchase`]}
                      helperText={
                        errors[`extra_materials_${idx}_last_purchase`] ||
                        (row.missing_price ? "Enter last purchase" : "")
                      }
                    />
                  </Grid>
                )}
                <Grid item size={{ xs: 6, md: 2 }}>
                  <Input
                    fullWidth
                    label="Unit Price (Incl GST)"
                    value={row.unit_incl !== "" && row.unit_incl != null ? Number(row.unit_incl).toFixed(2) : ""}
                    InputProps={{ readOnly: true }}
                    sx={{ bgcolor: "action.hover" }}
                  />
                </Grid>
                <Grid item size={{ xs: 6, md: 2 }}>
                  <Input
                    fullWidth
                    label="Amount"
                    value={row.line_amount !== "" && row.line_amount != null ? Number(row.line_amount).toFixed(2) : ""}
                    InputProps={{ readOnly: true }}
                    sx={{ bgcolor: "action.hover" }}
                  />
                </Grid>
                <Grid
                  item
                  size={{ xs: 12, md: 1.5 }}
                  sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={rows.length <= 1}
                    aria-label={`Remove extra material row ${idx + 1}`}
                  >
                    Remove
                  </Button>
                </Grid>
              </Grid>
            );
          })}
          <Box sx={{ mt: 0.25 }}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              aria-label="Add extra material row"
            >
              + Add
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
