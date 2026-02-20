"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import AutocompleteField from "@/components/common/AutocompleteField";
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
        <AutocompleteField
          label="Planned Warehouse"
          placeholder="Type to search..."
          options={warehouses}
          getOptionLabel={(w) => w?.name ?? `Warehouse ${w?.id ?? ""}`}
          value={warehouses.find((w) => w.id === parseInt(plannedWarehouseId)) || (plannedWarehouseId ? { id: parseInt(plannedWarehouseId) } : null)}
          onChange={(e, newValue) => setPlannedWarehouseId(newValue?.id ?? "")}
        />
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
