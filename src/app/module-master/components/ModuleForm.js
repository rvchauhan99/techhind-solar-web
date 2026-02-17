"use client";

import { useState, useEffect } from "react";
import { Box, Grid } from "@mui/material";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { MenuItem } from "@/components/common/Select";
import Checkbox from "@/components/common/Checkbox";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { Button } from "@/components/ui/button";
import { getAvailableIcons, getIcon, isValidIcon } from "@/utils/iconMapper";
import { COMPACT_FORM_SPACING, FORM_PADDING } from "@/utils/formConstants";

export default function ModuleForm({
  defaultValues = {},
  onSubmit,
  loading,
  parentOptions = [],
  serverError = null,
  onClearServerError = () => {},
  onCancel = null,
}) {
  const [formData, setFormData] = useState({
    name: "",
    key: "",
    icon: "",
    parent_id: null,
    route: "",
    sequence: 0,
    status: "active",
    authorize_with_params: false,
  });
  const [iconError, setIconError] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      setFormData({
        name: defaultValues.name ?? "",
        key: defaultValues.key ?? "",
        icon: defaultValues.icon ?? "",
        parent_id: defaultValues.parent_id ?? null,
        route: defaultValues.route ?? "",
        sequence: defaultValues.sequence ?? 0,
        status: defaultValues.status ?? "active",
        authorize_with_params: !!defaultValues.authorize_with_params,
      });
    }
  }, [defaultValues]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let nextValue = type === "checkbox" ? checked : value;
    if (name === "parent_id") {
      nextValue = value === "" ? null : Number(value);
    }
    if (name === "sequence") {
      nextValue = value === "" ? "" : Number(value);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (name === "icon") {
      if (value && value.trim() && !isValidIcon(value)) {
        setIconError(`Invalid icon: "${value}"`);
      } else {
        setIconError("");
      }
    }
    if (serverError) {
      onClearServerError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (formData.icon && formData.icon.trim() && !isValidIcon(formData.icon)) {
      setIconError("Please select a valid icon from the list.");
      return;
    }
    setIconError("");
    const validationErrors = {};
    if (!formData.name || String(formData.name).trim() === "") {
      validationErrors.name = "Name is required";
    }
    if (!formData.key || String(formData.key).trim() === "") {
      validationErrors.key = "Key is required";
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    const seqVal = formData.sequence;
    const isAutoSeq = seqVal === "" || seqVal == null || Number(seqVal) === 0;
    const payload = {
      ...formData,
      parent_id: formData.parent_id ? formData.parent_id : null,
      sequence: isAutoSeq ? null : Number(seqVal),
      authorize_with_params: !!formData.authorize_with_params,
    };
    try {
      setSubmitting(true);
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <FormContainer>
      <Box component="form" id="module-form" onSubmit={handleSubmit} sx={{ p: FORM_PADDING }}>
        {serverError && (
          <div className="mb-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center justify-between gap-2">
            <span>{serverError}</span>
            <button
              type="button"
              onClick={onClearServerError}
              className="shrink-0 text-destructive hover:underline"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        <Grid container spacing={COMPACT_FORM_SPACING}>
          <Grid item size={{ xs: 12, md: 6 }}>
            <Input
              name="name"
              label="Name"
              value={formData.name}
              onChange={handleChange}
              required
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>
          <Grid item size={{ xs: 12, md: 6 }}>
            <Input
              name="key"
              label="Key"
              value={formData.key}
              onChange={handleChange}
              required
              error={!!errors.key}
              helperText={errors.key}
            />
          </Grid>
          <Grid item size={{ xs: 12, md: 6 }}>
            <Select
              name="parent_id"
              label="Parent Module"
              value={formData.parent_id ?? ""}
              onChange={handleChange}
            >
              <MenuItem value="">None</MenuItem>
              {parentOptions.filter((p) => p.id !== defaultValues?.id).map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item size={{ xs: 12, md: 6 }}>
            <Select
              name="icon"
              label="Icon"
              value={formData.icon || ""}
              onChange={handleChange}
              error={!!iconError}
              helperText={iconError}
              placeholder="Select an icon"
              renderValue={(val) => {
                if (!val) return "Select an icon";
                const IconC = getIcon(val);
                return (
                  <span className="flex items-center gap-2">
                    <IconC className="size-4 shrink-0" />
                    <span>{val}</span>
                  </span>
                );
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {getAvailableIcons()
                .sort((a, b) => {
                  if (a.category !== b.category) return a.category.localeCompare(b.category);
                  return a.label.localeCompare(b.label);
                })
                .map((icon) => {
                  const IconC = icon.component;
                  return (
                    <MenuItem key={icon.name} value={icon.name}>
                      <span className="flex items-center gap-2 w-full">
                        <IconC className="size-4 shrink-0" />
                      <span className="flex flex-col">
                        <span className="text-sm">{icon.label}</span>
                        <span className="text-xs text-muted-foreground">{icon.category}</span>
                      </span>
                    </span>
                  </MenuItem>
                  );
                })}
            </Select>
          </Grid>
          <Grid item size={{ xs: 12, md: 6 }}>
            <Input
              name="route"
              label="Route"
              value={formData.route}
              onChange={handleChange}
            />
          </Grid>
          <Grid item size={{ xs: 12, md: 6 }}>
            <Input
              name="sequence"
              label="Sequence"
              type="number"
              value={formData.sequence ?? ""}
              onChange={handleChange}
              placeholder="Auto"
              helperText="Leave 0 or blank for auto-assignment"
            />
          </Grid>
          <Grid item size={{ xs: 12, md: 6 }}>
            <Select
              name="status"
              label="Status"
              value={formData.status || "active"}
              onChange={handleChange}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </Grid>
          <Grid item size={12}>
            <Checkbox
              name="authorize_with_params"
              label="Authorize with params"
              checked={!!formData.authorize_with_params}
              onChange={handleChange}
              helperText="When checked, the module may use query parameters in permission checks."
            />
          </Grid>
        </Grid>
      </Box>
      <FormActions>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" form="module-form" size="sm" disabled={submitting}>
          {submitting ? (defaultValues?.id ? "Updating..." : "Creating...") : (defaultValues?.id ? "Update" : "Create")}
        </Button>
      </FormActions>
    </FormContainer>
  );
}
