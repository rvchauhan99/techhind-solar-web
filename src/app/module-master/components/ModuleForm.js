"use client";

import { useState, useEffect } from "react";
import { Box, Grid } from "@mui/material";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
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
  const normalizeIconValue = (value) => {
    if (!value) return "";
    return String(value).trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  };

  const getInitialFormData = (defaults) => {
    if (defaults && (defaults.id != null || Object.keys(defaults || {}).length > 0)) {
      const normalizedParentId =
        defaults.parent_id === null ||
        defaults.parent_id === undefined ||
        defaults.parent_id === ""
          ? null
          : Number(defaults.parent_id);
      const normalizedIcon = normalizeIconValue(defaults.icon ?? "");
      return {
        name: defaults.name ?? "",
        key: defaults.key ?? "",
        icon: normalizedIcon,
        parent_id: Number.isNaN(normalizedParentId) ? null : normalizedParentId,
        route: defaults.route ?? "",
        sequence: defaults.sequence ?? 0,
        status: defaults.status ?? "active",
        authorize_with_params: !!defaults.authorize_with_params,
      };
    }
    return {
      name: "",
      key: "",
      icon: "",
      parent_id: null,
      route: "",
      sequence: 0,
      status: "active",
      authorize_with_params: false,
    };
  };

  const [formData, setFormData] = useState(() => getInitialFormData(defaultValues));
  const [iconError, setIconError] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      const normalizedParentId =
        defaultValues.parent_id === null ||
        defaultValues.parent_id === undefined ||
        defaultValues.parent_id === ""
          ? null
          : Number(defaultValues.parent_id);
      const normalizedIcon = normalizeIconValue(defaultValues.icon ?? "");
      setFormData({
        name: defaultValues.name ?? "",
        key: defaultValues.key ?? "",
        icon: normalizedIcon,
        parent_id: Number.isNaN(normalizedParentId) ? null : normalizedParentId,
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
    if (name === "icon") {
      nextValue = normalizeIconValue(value);
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
      icon: normalizeIconValue(formData.icon),
      parent_id:
        formData.parent_id === null || formData.parent_id === undefined || formData.parent_id === ""
          ? null
          : Number(formData.parent_id),
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

  const iconOptions = getAvailableIcons()
    .sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.label.localeCompare(b.label);
    });
  const hasCurrentIcon = iconOptions.some((opt) => opt.name === formData.icon);
  const iconOptionsWithCurrent = hasCurrentIcon || !formData.icon
    ? iconOptions
    : [
        {
          name: formData.icon,
          label: `${formData.icon} (legacy)`,
          component: getIcon(formData.icon),
          category: "Legacy",
        },
        ...iconOptions,
      ];

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
            <AutocompleteField
              name="parent_id"
              label="Parent Module"
              options={parentOptions.filter((p) => p.id !== defaultValues?.id)}
              getOptionLabel={(p) => p?.name ?? p?.label ?? ""}
              value={parentOptions.find((p) => p.id === formData.parent_id) || (formData.parent_id != null ? { id: formData.parent_id } : null)}
              onChange={(e, newValue) => handleChange({ target: { name: "parent_id", value: newValue?.id ?? "" } })}
              placeholder="None"
            />
          </Grid>
          <Grid item size={{ xs: 12, md: 6 }}>
            <AutocompleteField
              name="icon"
              label="Icon"
              options={iconOptionsWithCurrent}
              getOptionLabel={(o) => o?.label ?? o?.name ?? ""}
              value={iconOptionsWithCurrent.find((i) => i.name === formData.icon) || (formData.icon ? { name: formData.icon, label: formData.icon } : null)}
              onChange={(e, newValue) => handleChange({ target: { name: "icon", value: newValue?.name ?? "" } })}
              placeholder="Select an icon"
              error={!!iconError}
              helperText={iconError}
            />
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
            <AutocompleteField
              name="status"
              label="Status"
              options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
              getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
              value={formData.status ? { value: formData.status, label: formData.status === "active" ? "Active" : "Inactive" } : { value: "active", label: "Active" }}
              onChange={(e, newValue) => handleChange({ target: { name: "status", value: newValue?.value ?? "active" } })}
              placeholder="Status"
            />
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
