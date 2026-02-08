"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import {
  Box,
  MenuItem,
  Alert,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import { getAvailableIcons, getIcon, isValidIcon } from "@/utils/iconMapper";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";

const ModuleForm = forwardRef(function ModuleForm({
  defaultValues = {},
  onSubmit,
  loading,
  parentOptions = [],
  serverError = null,
  onClearServerError = () => {},
  viewMode = false, // If true, all inputs are disabled
  onCancel = null, // Optional cancel handler for modal
}, ref) {
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
    // clear server error when user edits fields
    if (serverError) onClearServerError();
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate icon if provided
    if (formData.icon && formData.icon.trim() !== "") {
      if (!isValidIcon(formData.icon)) {
        setIconError(`Invalid icon: "${formData.icon}". Please select a valid icon from the list.`);
        return;
      }
    }
    
    setIconError("");
    onSubmit(formData);
  };

  useImperativeHandle(ref, () => ({
    requestSubmit: () => {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    }
  }));

  if (loading) return <p>Loading...</p>;

  return (
    <>
      {serverError ? <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert> : null}
      
      <Box
        component="form"
        ref={formRef}
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", height: "100%",  }}
      >
        <Box sx={{ display: "grid", gap: 2, flex: 1, overflowY: "auto", pr: 1, pt: 2 }}>
          <Input 
            name="name" 
            label="Name" 
            value={formData.name || ""} 
            onChange={handleChange} 
            required={!viewMode}
            disabled={viewMode}
            fullWidth
          />
          <Input 
            name="key" 
            label="Key" 
            value={formData.key || ""} 
            onChange={handleChange} 
            required={!viewMode}
            disabled={viewMode}
            fullWidth
          />

          <Select
            name="parent_id"
            label="Parent Module"
            value={formData.parent_id ?? ""}
            onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
            disabled={viewMode}
          >
            <MenuItem value="">None</MenuItem>
            {parentOptions.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>

          <Select
            name="icon"
            label="Icon"
            value={formData.icon || ""}
            onChange={(e) => {
              if (serverError) onClearServerError();
              const selectedIcon = e.target.value;
              setFormData({ ...formData, icon: selectedIcon });
              
              // Validate icon on change
              if (selectedIcon && selectedIcon.trim() !== "") {
                if (!isValidIcon(selectedIcon)) {
                  setIconError(`Invalid icon: "${selectedIcon}"`);
                } else {
                  setIconError("");
                }
              } else {
                setIconError("");
              }
            }}
            disabled={viewMode}
            error={!!iconError}
            helperText={iconError}
            renderValue={(value) => {
              if (!value) return "Select an icon";
              const IconComponent = getIcon(value);
              const isValid = isValidIcon(value);
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <IconComponent fontSize="small" />
                  <span>{value}</span>
                  {!isValid && value && (
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
                // Sort by category first, then by label
                if (a.category !== b.category) {
                  return a.category.localeCompare(b.category);
                }
                return a.label.localeCompare(b.label);
              })
              .map((icon) => {
                const IconComponent = icon.component;
                return (
                  <MenuItem key={icon.name} value={icon.name}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
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
          
          {/* Icon Preview */}
          {formData.icon && (
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
                      color: isValidIcon(formData.icon) ? "primary.main" : "error.main" 
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
          )}
          <Input 
            name="route" 
            label="Route" 
            value={formData.route || ""} 
            onChange={handleChange}
            disabled={viewMode}
            fullWidth
          />

          <Input
            name="sequence"
            label="Sequence"
            type="number"
            value={formData.sequence ?? 1}
            onChange={(e) => {
              if (serverError) onClearServerError();
              setFormData({ ...formData, sequence: Number(e.target.value) });
            }}
            disabled={viewMode}
            fullWidth
          />

          <Select
            name="status"
            label="Status"
            value={formData.status || "active"}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            disabled={viewMode}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </Box>
      </Box>
    </>
  );
});

export default ModuleForm;
