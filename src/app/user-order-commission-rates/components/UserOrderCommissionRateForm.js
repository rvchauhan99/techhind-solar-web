"use client";

import { useState, useEffect } from "react";
import { Box, Grid, Typography, Alert } from "@mui/material";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import { COMPACT_FORM_SPACING, COMPACT_SECTION_HEADER_STYLE } from "@/utils/formConstants";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";

function localCalendarYmd(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function initialLocalEffectiveRange() {
  const t = new Date();
  const end = new Date(t);
  end.setFullYear(end.getFullYear() + 5);
  return { effective_from: localCalendarYmd(t), effective_to: localCalendarYmd(end) };
}

export default function UserOrderCommissionRateForm({
  defaultValues = {},
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => {},
  onCancel = null,
}) {
  const [formData, setFormData] = useState(() => ({
    user_id: "",
    order_type_id: "",
    branch_id: "",
    project_scheme_id: "",
    ...initialLocalEffectiveRange(),
    as_handled_by_per_kw: "",
    as_handled_by_per_kw_with_channel_partner: "",
    as_channel_partner_per_kw: "",
  }));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0 && defaultValues.id) {
      const fallback = initialLocalEffectiveRange();
      setFormData({
        user_id: defaultValues.user_id ?? "",
        order_type_id: defaultValues.order_type_id ?? "",
        branch_id: defaultValues.branch_id ?? "",
        project_scheme_id: defaultValues.project_scheme_id ?? "",
        effective_from: defaultValues.effective_from || fallback.effective_from,
        effective_to: defaultValues.effective_to || fallback.effective_to,
        as_handled_by_per_kw: defaultValues.as_handled_by_per_kw ?? "",
        as_handled_by_per_kw_with_channel_partner:
          defaultValues.as_handled_by_per_kw_with_channel_partner ?? "",
        as_channel_partner_per_kw: defaultValues.as_channel_partner_per_kw ?? "",
      });
    }
  }, [defaultValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (serverError) onClearServerError();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = {};
    if (!formData.user_id) validationErrors.user_id = "User is required";

    const nonNeg = (label, key) => {
      if (formData[key] === "" || formData[key] == null) return;
      const n = Number(formData[key]);
      if (!Number.isFinite(n) || n < 0) validationErrors[key] = `${label} cannot be negative`;
    };
    nonNeg("Handled-by rate", "as_handled_by_per_kw");
    nonNeg("Handled-by (with CP) rate", "as_handled_by_per_kw_with_channel_partner");
    nonNeg("Channel partner rate", "as_channel_partner_per_kw");

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    const toNumber = (v) =>
      v === "" || v === null || v === undefined ? null : Number(v);

    const payload = {
      user_id: Number(formData.user_id),
      order_type_id: formData.order_type_id ? Number(formData.order_type_id) : null,
      branch_id: formData.branch_id ? Number(formData.branch_id) : null,
      project_scheme_id: formData.project_scheme_id ? Number(formData.project_scheme_id) : null,
      effective_from: formData.effective_from || null,
      effective_to: formData.effective_to || null,
      as_handled_by_per_kw: toNumber(formData.as_handled_by_per_kw),
      as_handled_by_per_kw_with_channel_partner: toNumber(
        formData.as_handled_by_per_kw_with_channel_partner
      ),
      as_channel_partner_per_kw: toNumber(formData.as_channel_partner_per_kw),
    };

    onSubmit(payload);
  };

  return (
    <FormContainer>
      <Box
        component="form"
        id="user-order-commission-rate-form"
        onSubmit={handleSubmit}
        onKeyDown={preventEnterSubmit}
        noValidate
        sx={{ mt: 1 }}
      >
        {serverError && (
          <Box mb={1}>
            <Alert severity="error">{serverError}</Alert>
          </Box>
        )}

        <Box sx={COMPACT_SECTION_HEADER_STYLE}>
          <Typography variant="subtitle1" fontWeight={600}>
            Scope
          </Typography>
        </Box>
        <Grid container spacing={COMPACT_FORM_SPACING}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <AutocompleteField
              name="user_id"
              label="User"
              required
              asyncLoadOptions={(q) =>
                getReferenceOptionsSearch("user.model", { q, limit: 20, status: "active" })
              }
              referenceModel="user.model"
              getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
              value={
                formData.user_id
                  ? { id: formData.user_id, name: defaultValues?.user_name }
                  : null
              }
              onChange={(_e, newValue) =>
                handleChange({ target: { name: "user_id", value: newValue?.id ?? "" } })
              }
              placeholder="Type to search…"
              error={!!errors.user_id}
              helperText={errors.user_id}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <AutocompleteField
              name="order_type_id"
              label="Order type"
              asyncLoadOptions={(q) =>
                getReferenceOptionsSearch("order_type.model", { q, limit: 20 })
              }
              referenceModel="order_type.model"
              getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
              value={
                formData.order_type_id
                  ? { id: formData.order_type_id, name: defaultValues?.order_type_name }
                  : null
              }
              onChange={(_e, newValue) =>
                handleChange({ target: { name: "order_type_id", value: newValue?.id ?? "" } })
              }
              placeholder="Optional (all types if empty)"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <AutocompleteField
              name="branch_id"
              label="Branch"
              asyncLoadOptions={(q) =>
                getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })
              }
              referenceModel="company_branch.model"
              getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
              value={
                formData.branch_id
                  ? { id: formData.branch_id, name: defaultValues?.branch_name }
                  : null
              }
              onChange={(_e, newValue) =>
                handleChange({ target: { name: "branch_id", value: newValue?.id ?? "" } })
              }
              placeholder="Optional"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <AutocompleteField
              name="project_scheme_id"
              label="Project scheme"
              asyncLoadOptions={(q) =>
                getReferenceOptionsSearch("project_scheme.model", { q, limit: 20 })
              }
              referenceModel="project_scheme.model"
              getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
              value={
                formData.project_scheme_id
                  ? { id: formData.project_scheme_id, name: defaultValues?.project_scheme_name }
                  : null
              }
              onChange={(_e, newValue) =>
                handleChange({
                  target: { name: "project_scheme_id", value: newValue?.id ?? "" },
                })
              }
              placeholder="Optional"
            />
          </Grid>
        </Grid>

        <Box sx={COMPACT_SECTION_HEADER_STYLE}>
          <Typography variant="subtitle1" fontWeight={600}>
            Effective period & rates (per kW)
          </Typography>
        </Box>
        <Grid container spacing={COMPACT_FORM_SPACING}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Input
              fullWidth
              size="small"
              type="date"
              label="Effective from"
              name="effective_from"
              value={formData.effective_from}
              onChange={handleChange}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Input
              fullWidth
              size="small"
              type="date"
              label="Effective to"
              name="effective_to"
              value={formData.effective_to}
              onChange={handleChange}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Input
              fullWidth
              size="small"
              type="number"
              label="Handled by / kW"
              name="as_handled_by_per_kw"
              value={formData.as_handled_by_per_kw}
              onChange={handleChange}
              error={!!errors.as_handled_by_per_kw}
              helperText={errors.as_handled_by_per_kw}
              inputProps={{ min: 0, step: "any" }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Input
              fullWidth
              size="small"
              type="number"
              label="Handled by / kW (with CP)"
              name="as_handled_by_per_kw_with_channel_partner"
              value={formData.as_handled_by_per_kw_with_channel_partner}
              onChange={handleChange}
              error={!!errors.as_handled_by_per_kw_with_channel_partner}
              helperText={errors.as_handled_by_per_kw_with_channel_partner}
              inputProps={{ min: 0, step: "any" }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Input
              fullWidth
              size="small"
              type="number"
              label="Channel partner / kW"
              name="as_channel_partner_per_kw"
              value={formData.as_channel_partner_per_kw}
              onChange={handleChange}
              error={!!errors.as_channel_partner_per_kw}
              helperText={errors.as_channel_partner_per_kw}
              inputProps={{ min: 0, step: "any" }}
            />
          </Grid>
        </Grid>
      </Box>

      <FormActions>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <LoadingButton
          type="submit"
          form="user-order-commission-rate-form"
          loading={loading}
          className="min-w-[120px]"
        >
          {defaultValues?.id ? "Update" : "Add"}
        </LoadingButton>
      </FormActions>
    </FormContainer>
  );
}
