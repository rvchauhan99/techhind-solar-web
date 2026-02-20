"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import Select, { MenuItem } from "@/components/common/Select";
import companyService from "@/services/companyService";

export default function B2bSalesOrderEditForm({
  defaultValues = {},
  onSubmit,
  onConfirm,
  loading,
  serverError = null,
  onClearServerError = () => {},
  onCancel = null,
}) {
  const [plannedWarehouseId, setPlannedWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    companyService
      .listWarehouses()
      .then((res) => {
        const r = res?.result ?? res;
        const data = r?.data ?? r ?? [];
        setWarehouses(Array.isArray(data) ? data : []);
      })
      .catch(() => setWarehouses([]));
  }, []);

  useEffect(() => {
    if (defaultValues?.planned_warehouse_id) {
      setPlannedWarehouseId(String(defaultValues.planned_warehouse_id));
    }
  }, [defaultValues?.planned_warehouse_id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (serverError) onClearServerError();
    const payload = {
      planned_warehouse_id: plannedWarehouseId ? parseInt(plannedWarehouseId, 10) : null,
    };
    onSubmit(payload);
  };

  const warehouseOptions = warehouses.map((w) => ({
    value: w.id,
    label: w.name || `Warehouse ${w.id}`,
  }));

  const isDraft = defaultValues?.status === "DRAFT";
  const canConfirm = isDraft && plannedWarehouseId;

  return (
    <FormContainer>
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{serverError}</div>
        )}
        <p className="text-sm text-muted-foreground">
          Order #{defaultValues?.order_no || defaultValues?.id}. Set planned warehouse to enable shipment creation.
        </p>
        <Select
          label="Planned Warehouse"
          value={plannedWarehouseId}
          onChange={(e) => setPlannedWarehouseId(e.target.value)}
          placeholder="Select warehouse"
        >
          <MenuItem value="">Select warehouse</MenuItem>
          {warehouseOptions.map((o) => (
            <MenuItem key={o.value} value={String(o.value)}>{o.label}</MenuItem>
          ))}
        </Select>
        <FormActions>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
          {canConfirm && onConfirm && (
            <Button
              type="button"
              variant="default"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "Confirming..." : "Confirm Order"}
            </Button>
          )}
        </FormActions>
      </form>
    </FormContainer>
  );
}
