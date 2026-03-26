"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Alert,
  Typography,
} from "@mui/material";
import Link from "next/link";
import AutocompleteField from "@/components/common/AutocompleteField";
import Checkbox from "@/components/common/Checkbox";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";

export default function RoleModuleForm({ defaultValues = null, onSubmit, loading, roles = [], modules = [], serverError = null, onClearServerError = () => {} }) {
  const base = {
    role_id: null,
    module_id: null,
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
    listing_criteria: "my_team",
  };

  const [formData, setFormData] = useState({ ...base, ...(defaultValues || {}) });
  const [submitting, setSubmitting] = useState(false);

  // Only apply defaults when we have meaningful defaultValues (e.g. edit case).
  useEffect(() => {
    if (defaultValues && (defaultValues.id || Object.keys(defaultValues).length)) {
      setFormData({ ...base, ...defaultValues });
    }
    // only re-run when defaultValues.id changes (or defaultValues reference becomes a real object)
  }, [defaultValues?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (serverError) onClearServerError();
    const normalizedValue =
      name === "role_id" || name === "module_id"
        ? (value === "" ? null : Number(value))
        : value;
    setFormData((s) => ({ ...s, [name]: normalizedValue }));
  };

  const handleCheckboxChange = (name, checked) => {
    if (serverError) onClearServerError();
    setFormData((s) => ({ ...s, [name]: !!checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <Box component="form" onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} sx={{ display: "grid", gap: 2, maxWidth: 700 }}>
      <Typography variant="h5">{defaultValues?.id ? 'Update Role-Module' : 'Add Role-Module'}</Typography>
      {serverError ? <Alert severity="error">{serverError}</Alert> : null}

      <AutocompleteField
        name="role_id"
        label="Role"
        options={roles}
        getOptionLabel={(r) => r?.name ?? r?.label ?? ""}
        value={roles.find((r) => r.id === formData.role_id) || (formData.role_id != null ? { id: formData.role_id } : null)}
        onChange={(e, newValue) => handleChange({ target: { name: "role_id", value: newValue?.id ?? "" } })}
        placeholder="Select Role"
        required
      />

      <AutocompleteField
        name="module_id"
        label="Module"
        options={modules}
        getOptionLabel={(m) => m?.name ?? m?.label ?? ""}
        value={modules.find((m) => m.id === formData.module_id) || (formData.module_id != null ? { id: formData.module_id } : null)}
        onChange={(e, newValue) => handleChange({ target: { name: "module_id", value: newValue?.id ?? "" } })}
        placeholder="Select Module"
        required
      />

      <AutocompleteField
        name="listing_criteria"
        label="Listing Criteria"
        options={[{ value: "all", label: "All" }, { value: "my_team", label: "My Team" }]}
        getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
        value={formData.listing_criteria ? { value: formData.listing_criteria, label: formData.listing_criteria === "all" ? "All" : "My Team" } : { value: "my_team", label: "My Team" }}
        onChange={(e, newValue) => handleChange({ target: { name: "listing_criteria", value: newValue?.value ?? "my_team" } })}
        placeholder="Listing Criteria"
      />

  <Checkbox name="can_create" label="Can Create" checked={!!formData.can_create} onChange={(e) => handleCheckboxChange('can_create', e.target.checked)} />
  <Checkbox name="can_read" label="Can Read" checked={!!formData.can_read} onChange={(e) => handleCheckboxChange('can_read', e.target.checked)} />
  <Checkbox name="can_update" label="Can Update" checked={!!formData.can_update} onChange={(e) => handleCheckboxChange('can_update', e.target.checked)} />
  <Checkbox name="can_delete" label="Can Delete" checked={!!formData.can_delete} onChange={(e) => handleCheckboxChange('can_delete', e.target.checked)} />

      <Box mt={2}>
        <Button component={Link} href="/role-module" variant="outlined" sx={{ mr: 1 }} disabled={submitting}>Back</Button>
        <Button variant="contained" type="submit" disabled={submitting}>
          {submitting ? (defaultValues?.id ? "Updating..." : "Creating...") : (defaultValues?.id ? 'Update' : 'Create')}
        </Button>
      </Box>
    </Box>
  );
}
