"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import {
  Box,
  Grid,
  MenuItem,
  Alert,
  Paper,
  Typography,
} from "@mui/material";
import { getAvailableIcons, getIcon, isValidIcon } from "@/utils/iconMapper";
import { COMPACT_FORM_SPACING } from "@/utils/formConstants";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";

const ModuleForm = forwardRef(function ModuleForm(
  {
    defaultValues = {},
    onSubmit,
    loading,
    parentOptions = [],
    serverError = null,
    onClearServerError = () => {},
    viewMode = false, // If true, all inputs are disabled
    onCancel = null, // Optional cancel handler for modal
  },
  ref
) {
  const base = {
    name: "",
    key: "",
    icon: "",
    parent_id: null,
    route: "",
    sequence: 0,
    status: "active",
  };

  const [formData, setFormData] = useState({
    ...base,
    ...(defaultValues || {}),
  });
  const [iconError, setIconError] = useState("");
  const formRef = useRef(null);

  useEffect(() => {
    if (
      defaultValues &&
      (defaultValues.id || Object.keys(defaultValues).length)
    ) {
      setFormData({ ...base, ...defaultValues });
    } else {
      setFormData(base);
    }
  }, [defaultValues?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (serverError) onClearServerError();

    // icon field: live validation
    if (name === "icon") {
      const selectedIcon = value;
      if (selectedIcon && selectedIcon.trim() !== "") {
        if (!isValidIcon(selectedIcon)) {
          setIconError(`Invalid icon: "${selectedIcon}"`);
        } else {
          setIconError("");
        }
      } else {
        setIconError("");
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Final icon validation on submit
    if (formData.icon && formData.icon.trim() !== "") {
      if (!isValidIcon(formData.icon)) {
        setIconError(
          `Invalid icon: "${formData.icon}". Please select a valid icon from the list.`
        );
        return;
      }
    }

    // Normalize values for API - send sequence: null when 0 or blank for backend auto-assignment
    const seqVal = formData.sequence;
    const isAutoSeq = seqVal === "" || seqVal == null || Number(seqVal) === 0;
    const payload = {
      ...formData,
      parent_id: formData.parent_id ? formData.parent_id : null,
      sequence: isAutoSeq ? null : Number(seqVal),
    };

    onSubmit(payload);
  };

  useImperativeHandle(ref, () => ({
    requestSubmit: () => {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    },
  }));

  if (loading) return <p>Loading...</p>;

  return (
    <>
      {serverError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      ) : null}

      <Box
        component="form"
        ref={formRef}
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
        }}
      >
        <Grid
          container
          spacing={COMPACT_FORM_SPACING}
          sx={{
            flex: 1,
            overflowY: "auto",
            alignContent: "flex-start",
          }}
        >
          <Grid item size={{ xs: 12, sm: 6 }}>
            <Input
              name="name"
              label="Name"
              value={formData.name || ""}
              onChange={handleChange}
              required={!viewMode}
              disabled={viewMode}
            />
          </Grid>
          <Grid item size={{ xs: 12, sm: 6 }}>
            <Input
              name="key"
              label="Key"
              value={formData.key || ""}
              onChange={handleChange}
              required={!viewMode}
              disabled={viewMode}
            />
          </Grid>
          <Grid item size={{ xs: 12, sm: 6 }}>
            <Select
              name="parent_id"
              label="Parent Module"
              value={formData.parent_id ?? ""}
              onChange={handleChange}
              disabled={viewMode}
            >
              <MenuItem value="">None</MenuItem>
              {parentOptions.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item size={{ xs: 12, sm: 6 }}>
            <Select
            name="icon"
            label="Icon"
            value={formData.icon || ""}
            onChange={handleChange}
            disabled={viewMode}
            error={!!iconError}
            helperText={iconError}
            renderValue={(value) => {
              if (!value) return "Select an icon";
              const IconComponent = getIcon(value);
              const valid = isValidIcon(value);
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <IconComponent fontSize="small" />
                  <span>{value}</span>
                  {!valid && value && (
                    <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                      (Invalid)
                    </Typography>
                  )}
                </Box>
              );
            }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {getAvailableIcons()
              .sort((a, b) => {
                if (a.category !== b.category) {
                  return a.category.localeCompare(b.category);
                }
                return a.label.localeCompare(b.label);
              })
              .map((icon) => {
                const IconComponent = icon.component;
                return (
                  <MenuItem key={icon.name} value={icon.name}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        width: "100%",
                      }}
                    >
                      <IconComponent fontSize="small" />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{icon.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {icon.category}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                );
              })}
          </Select>
          </Grid>

          {formData.icon && (
            <Grid item size={12}>
            <Paper
              sx={{
                p: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
                bgcolor: isValidIcon(formData.icon) ? "grey.50" : "error.light",
                border: isValidIcon(formData.icon) ? "none" : "1px solid",
                borderColor: "error.main",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Icon Preview
              </Typography>
              {(() => {
                const IconComponent = getIcon(formData.icon);
                return (
                  <IconComponent
                    sx={{
                      fontSize: 40,
                      color: isValidIcon(formData.icon)
                        ? "primary.main"
                        : "error.main",
                    }}
                  />
                );
              })()}
              <Typography variant="body2" color="text.secondary">
                {formData.icon}
              </Typography>
              {!isValidIcon(formData.icon) && (
                <Typography variant="caption" color="error">
                  ⚠️ Invalid icon name
                </Typography>
              )}
            </Paper>
            </Grid>
          )}

          <Grid item size={{ xs: 12, sm: 6 }}>
            <Input
              name="route"
              label="Route"
              value={formData.route || ""}
              onChange={handleChange}
              disabled={viewMode}
            />
          </Grid>

          <Grid item size={{ xs: 12, sm: 6 }}>
            <Input
              name="sequence"
              label="Sequence"
              type="number"
              value={formData.sequence ?? ""}
              onChange={handleChange}
              disabled={viewMode}
              placeholder="Auto"
              helperText="Leave 0 or blank for auto-assignment"
            />
          </Grid>

          <Grid item size={{ xs: 12, sm: 6 }}>
            <Select
              name="status"
              label="Status"
              value={formData.status || "active"}
              onChange={handleChange}
              disabled={viewMode}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </Grid>
        </Grid>
      </Box>
    </>
  );
});

export default ModuleForm;
