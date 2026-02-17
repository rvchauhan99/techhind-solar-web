"use client";

import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert,
  Typography,
} from "@mui/material";
import Link from "next/link";

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
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2, maxWidth: 700 }}>
      <Typography variant="h5">{defaultValues?.id ? 'Update Role-Module' : 'Add Role-Module'}</Typography>
      {serverError ? <Alert severity="error">{serverError}</Alert> : null}

      <FormControl>
        <InputLabel id="role-label">Role</InputLabel>
        <Select labelId="role-label" name="role_id" value={formData.role_id ?? ""} label="Role" onChange={handleChange} required>
          <MenuItem value="">Select Role</MenuItem>
          {roles.map((r) => (<MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>))}
        </Select>
      </FormControl>

      <FormControl>
        <InputLabel id="module-label">Module</InputLabel>
        <Select labelId="module-label" name="module_id" value={formData.module_id ?? ""} label="Module" onChange={handleChange} required>
          <MenuItem value="">Select Module</MenuItem>
          {modules.map((m) => (<MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>))}
        </Select>
      </FormControl>

      <FormControl>
        <InputLabel id="listing-criteria-label">Listing Criteria</InputLabel>
        <Select
          labelId="listing-criteria-label"
          name="listing_criteria"
          value={formData.listing_criteria ?? "my_team"}
          label="Listing Criteria"
          onChange={handleChange}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="my_team">My Team</MenuItem>
        </Select>
      </FormControl>

  <FormControlLabel control={<Checkbox name="can_create" checked={!!formData.can_create} onChange={(e) => handleCheckboxChange('can_create', e.target.checked)} />} label="Can Create" />
  <FormControlLabel control={<Checkbox name="can_read" checked={!!formData.can_read} onChange={(e) => handleCheckboxChange('can_read', e.target.checked)} />} label="Can Read" />
  <FormControlLabel control={<Checkbox name="can_update" checked={!!formData.can_update} onChange={(e) => handleCheckboxChange('can_update', e.target.checked)} />} label="Can Update" />
  <FormControlLabel control={<Checkbox name="can_delete" checked={!!formData.can_delete} onChange={(e) => handleCheckboxChange('can_delete', e.target.checked)} />} label="Can Delete" />

      <Box mt={2}>
        <Button component={Link} href="/role-module" variant="outlined" sx={{ mr: 1 }} disabled={submitting}>Back</Button>
        <Button variant="contained" type="submit" disabled={submitting}>
          {submitting ? (defaultValues?.id ? "Updating..." : "Creating...") : (defaultValues?.id ? 'Update' : 'Create')}
        </Button>
      </Box>
    </Box>
  );
}
