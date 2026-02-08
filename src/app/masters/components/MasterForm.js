"use client";

import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  Checkbox,
  Alert,
  Typography,
  MenuItem,
  CircularProgress,
  FormHelperText,
} from "@mui/material";
import Link from "next/link";
import { getReferenceOptions } from "@/services/mastersService";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import DateField from "@/components/common/DateField";

export default function MasterForm({ 
  fields = [], 
  defaultValues = null, 
  onSubmit, 
  loading, 
  serverError = null, 
  onClearServerError = () => {},
  masterName = "Master",
  onCancel = null,
  viewMode = false, // If true, all inputs are disabled
  requiredFields = [] // Array of field names that are required
}) {
  // Initialize form data based on fields
  const getInitialFormData = () => {
    const base = {};
    fields.forEach((field) => {
      if (field.name === 'id' || field.name === 'created_at' || field.name === 'updated_at' || field.name === 'deleted_at') {
        return; // Skip internal fields
      }
      
      if (field.isMultiSelect) {
        base[field.name] = [];
      } else if (field.type === 'BOOLEAN') {
        base[field.name] = field.defaultValue !== undefined ? field.defaultValue : false;
      } else if (field.type === 'INTEGER' || field.type === 'DECIMAL' || field.type === 'FLOAT') {
        base[field.name] = field.defaultValue !== undefined ? field.defaultValue : '';
      } else {
        base[field.name] = field.defaultValue !== undefined ? field.defaultValue : '';
      }
    });
    return base;
  };

  const [formData, setFormData] = useState({ ...getInitialFormData(), ...(defaultValues || {}) });
  const [referenceOptions, setReferenceOptions] = useState({}); // Store options for each reference field
  const [loadingOptions, setLoadingOptions] = useState({}); // Track loading state for each field
  const [errors, setErrors] = useState({}); // Track validation errors
  const [selectedFile, setSelectedFile] = useState(null); // Store selected file for upload
  const fetchedModelsRef = useRef(new Set()); // Track which models have been fetched
  const fetchingRef = useRef(false); // Track if we're currently fetching

  // Fetch reference options when fields change
  useEffect(() => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }

    const fetchReferenceOptions = async () => {
      const optionsMap = {};
      const modelsToFetch = [];

      // Collect unique models that need to be fetched
      for (const field of fields) {
        if (field.reference && field.reference.model) {
          // Only fetch if we haven't fetched this model yet and don't have options
          if (!fetchedModelsRef.current.has(field.reference.model) && !referenceOptions[field.name]) {
            modelsToFetch.push({ fieldName: field.name, model: field.reference.model });
            fetchedModelsRef.current.add(field.reference.model);
          }
        }
      }

      // If no new models to fetch, return early
      if (modelsToFetch.length === 0) {
        return;
      }

      fetchingRef.current = true;

      // Fetch options for each unique model
      for (const { fieldName, model } of modelsToFetch) {
        setLoadingOptions((prev) => ({ ...prev, [fieldName]: true }));

        try {
          const response = await getReferenceOptions(model);
          const options = response.result || response.data || response || [];
          optionsMap[fieldName] = Array.isArray(options) ? options : [];
        } catch (error) {
          console.error(`Error fetching options for ${fieldName}:`, error);
          optionsMap[fieldName] = [];
        } finally {
          setLoadingOptions((prev) => ({ ...prev, [fieldName]: false }));
        }
      }

      // Update reference options for all fields that use the fetched models
      setReferenceOptions((prev) => {
        const updated = { ...prev };
        for (const field of fields) {
          if (field.reference && field.reference.model) {
            // Find the field that fetched this model
            const fetchedField = modelsToFetch.find(m => m.model === field.reference.model);
            if (fetchedField && optionsMap[fetchedField.fieldName]) {
              updated[field.name] = optionsMap[fetchedField.fieldName];
            }
          }
        }
        return updated;
      });

      fetchingRef.current = false;
    };

    if (fields.length > 0) {
      fetchReferenceOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  useEffect(() => {
    if (defaultValues && (defaultValues.id || Object.keys(defaultValues).length)) {
      setFormData({ ...getInitialFormData(), ...defaultValues });
      // Reset file selection when switching records
      setSelectedFile(null);
    }
  }, [defaultValues?.id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (serverError) onClearServerError();
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    if (type === 'checkbox') {
      setFormData((s) => ({ ...s, [name]: checked }));
    } else {
      // Check if this is a reference field (foreign key) that should be a number
      const field = fields.find(f => f.name === name);
      if (field && field.isMultiSelect) {
        // Expect value as array of string IDs → convert to numbers
        const valuesArray = Array.isArray(value) ? value : [];
        const numValues = valuesArray.map(v => Number(v)).filter(v => !isNaN(v));
        setFormData((s) => ({ ...s, [name]: numValues }));
      } else if (field && field.reference && (field.type === 'INTEGER' || field.type === 'DECIMAL' || field.type === 'FLOAT')) {
        // Convert to number for foreign key fields
        const numValue = value === '' ? null : Number(value);
        setFormData((s) => ({ ...s, [name]: isNaN(numValue) ? value : numValue }));
      } else {
        setFormData((s) => ({ ...s, [name]: value }));
      }
    }
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Set field value in formData for validation
      setFormData((prev) => ({ ...prev, [fieldName]: file.name }));
      // Clear error for this field when file is selected
      if (errors[fieldName]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (viewMode) return; // Don't submit in view mode
    
    // Validate required fields
    const validationErrors = {};
    requiredFields.forEach((fieldName) => {
      const value = formData[fieldName];
      const field = fields.find(f => f.name === fieldName);
      // Special handling for file upload fields - check if file is selected
      if (field && field.isFileUpload) {
        if (!selectedFile && (!value || value === '')) {
          validationErrors[fieldName] = 'This field is required';
        }
      } else if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        validationErrors[fieldName] = 'This field is required';
      }
    });
    
    // If there are validation errors, set them and return
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    // Clear errors if validation passes
    setErrors({});
    
    // Clean up form data - convert empty strings to null for reference fields and remove empty strings for non-required fields
    const cleanedData = { ...formData };
    Object.keys(cleanedData).forEach((key) => {
      const field = fields.find(f => f.name === key);
      
      // For reference fields (foreign keys), convert empty string to null
      if (field && field.reference && (field.type === 'INTEGER' || field.type === 'DECIMAL' || field.type === 'FLOAT')) {
        if (cleanedData[key] === '' || cleanedData[key] === null || cleanedData[key] === undefined) {
          cleanedData[key] = null;
        }
      } else if (cleanedData[key] === '' && !requiredFields.includes(key)) {
        // For non-required fields, remove empty strings if nullable
        if (field && field.allowNull) {
          delete cleanedData[key];
        }
      }
    });
    
    // Pass file separately if it exists
    onSubmit(cleanedData, selectedFile);
  };

  const renderField = (field) => {
    const fieldName = field.name;
    const fieldValue = formData[fieldName] ?? '';
    
    // Format label: remove _id suffix for reference fields and convert to Title Case
    let fieldLabel = fieldName;
    if (field.reference && fieldLabel.endsWith('_id')) {
      fieldLabel = fieldLabel.replace(/_id$/, ''); // Remove _id suffix
    }
    // Convert snake_case to Title Case
    fieldLabel = fieldLabel
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Check if field is required from requiredFields array
    const isRequired = requiredFields.includes(fieldName);
    const hasError = errors[fieldName];
    
    // Use fieldLabel without asterisk (Material-UI will add it automatically with required prop)
    const displayLabel = fieldLabel;

    // Skip internal fields
    if (['id', 'created_at', 'updated_at', 'deleted_at'].includes(fieldName)) {
      return null;
    }

    // Render based on field type
    // Multiselect (custom)
    if (field.isMultiSelect && field.reference) {
      const options = referenceOptions[fieldName] || [];
      const isLoading = loadingOptions[fieldName];
      return (
        isLoading ? (
          <Box key={fieldName} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Loading options...</Typography>
          </Box>
        ) : (
          <Select
            key={fieldName}
            name={fieldName}
            label={displayLabel}
            value={Array.isArray(fieldValue) ? fieldValue.map(v => String(v)) : []}
            onChange={handleChange}
            disabled={viewMode || isLoading}
            required={isRequired && !viewMode}
            error={hasError}
            helperText={hasError ? errors[fieldName] : null}
            multiple
            renderValue={(selected) => {
              const selectedLabels = (selected || []).map(val => {
                const opt = options.find(o => String(o.value) === String(val));
                return opt ? opt.label : val;
              });
              return selectedLabels.join(', ');
            }}
          >
            {options.length === 0 ? (
              <MenuItem value="" disabled>No options available</MenuItem>
            ) : (
              options.map((option) => (
                <MenuItem key={option.id || option.value} value={String(option.value)}>
                  {option.label}
                </MenuItem>
              ))
            )}
          </Select>
        )
      );
    }

    switch (field.type) {
      case 'BOOLEAN':
        return (
          <FormControlLabel
            key={fieldName}
            control={
              <Checkbox
                name={fieldName}
                checked={fieldValue === true || fieldValue === 'true' || fieldValue === 1}
                onChange={handleChange}
                disabled={viewMode}
              />
            }
            label={displayLabel}
          />
        );

      case 'INTEGER':
      case 'DECIMAL':
      case 'FLOAT':
        // Check if this is a reference field (foreign key)
        if (field.reference) {
          const options = referenceOptions[fieldName] || [];
          const isLoading = loadingOptions[fieldName];

          return (
            isLoading ? (
              <Box key={fieldName} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Loading options...</Typography>
              </Box>
            ) : (
              <Select
                key={fieldName}
                name={fieldName}
                label={displayLabel}
                value={fieldValue !== null && fieldValue !== undefined ? String(fieldValue) : ''}
                onChange={handleChange}
                disabled={viewMode || isLoading}
                required={isRequired && !viewMode}
                error={hasError}
                helperText={hasError ? errors[fieldName] : null}
              >
                {options.length === 0 ? (
                  <MenuItem value="" disabled>No options available</MenuItem>
                ) : (
                  options.map((option) => (
                    <MenuItem key={option.id || option.value} value={String(option.value)}>
                      {option.label}
                    </MenuItem>
                  ))
                )}
              </Select>
            )
          );
        }

        return (
          <Input
            key={fieldName}
            name={fieldName}
            label={displayLabel}
            type="number"
            value={fieldValue}
            onChange={handleChange}
            required={isRequired && !viewMode}
            disabled={viewMode}
            error={hasError}
            helperText={hasError ? errors[fieldName] : ''}
          />
        );

      case 'DATE':
      case 'DATEONLY':
        return (
          <DateField
            key={fieldName}
            name={fieldName}
            label={displayLabel}
            value={fieldValue ? (fieldValue instanceof Date ? fieldValue.toISOString().split('T')[0] : fieldValue.split('T')[0]) : ''}
            onChange={handleChange}
            required={isRequired && !viewMode}
            disabled={viewMode}
            error={hasError}
            helperText={hasError ? errors[fieldName] : ''}
          />
        );

      case 'TEXT':
        return (
          <Input
            key={fieldName}
            name={fieldName}
            label={displayLabel}
            multiline
            rows={4}
            value={fieldValue}
            onChange={handleChange}
            required={isRequired && !viewMode}
            disabled={viewMode}
            error={hasError}
            helperText={hasError ? errors[fieldName] : ''}
          />
        );

      case 'STRING':
      default:
        // Check if it's a file upload field (configured in masters.json)
        if (field.isFileUpload) {
          return (
            <Box key={fieldName} sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: isRequired ? 'bold' : 'normal' }}>
                {displayLabel}
                {isRequired && <span style={{ color: 'red' }}> *</span>}
              </Typography>
              {!viewMode ? (
                <>
                  <input
                    accept="*/*"
                    style={{ display: 'none' }}
                    id={`file-upload-${fieldName}`}
                    type="file"
                    onChange={(e) => handleFileChange(e, fieldName)}
                  />
                  <label htmlFor={`file-upload-${fieldName}`}>
                    <Button variant="outlined" component="span" fullWidth>
                      {selectedFile ? selectedFile.name : (fieldValue || 'Choose File')}
                    </Button>
                  </label>
                  {selectedFile && (
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                      Selected: {selectedFile.name}
                    </Typography>
                  )}
                  {hasError && (
                    <FormHelperText error>{errors[fieldName]}</FormHelperText>
                  )}
                </>
              ) : (
                <Box>
                  {fieldValue ? (
                    <Typography variant="body2" color="text.secondary">
                      File: {fieldValue}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No file uploaded</Typography>
                  )}
                </Box>
              )}
            </Box>
          );
        }
        
        // Check if it's a status field or enum-like field
        if (fieldName.toLowerCase().includes('status')) {
          return (
            <Select
              key={fieldName}
              name={fieldName}
              label={displayLabel}
              value={fieldValue || 'active'}
              onChange={handleChange}
              disabled={viewMode}
              required={isRequired && !viewMode}
              error={hasError}
              helperText={hasError ? errors[fieldName] : null}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          );
        }
        
        return (
          <Input
            key={fieldName}
            name={fieldName}
            label={displayLabel}
            value={fieldValue}
            onChange={handleChange}
            required={isRequired && !viewMode}
            disabled={viewMode}
            error={hasError}
            helperText={hasError ? errors[fieldName] : ''}
          />
        );
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2, pt: 1 }}>
      {serverError ? (
        <Alert severity="error" onClose={onClearServerError}>
          {serverError}
        </Alert>
      ) : null}

      <Box sx={{ display: "grid", gap: 2 }}>
        {fields.map((field, index) => {
          const renderedField = renderField(field);
          if (!renderedField) return null;
          
          // Find first visible field (skip internal fields)
          const isFirstVisible = fields
            .slice(0, index)
            .every(f => ['id', 'created_at', 'updated_at', 'deleted_at'].includes(f.name));
          
          // Add extra margin to first visible field
          if (isFirstVisible) {
            return (
              <Box key={field.name || `field-${index}`} sx={{ mt: 1 }}>
                {renderedField}
              </Box>
            );
          }
          
          return (
            <Box key={field.name || `field-${index}`}>
              {renderedField}
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        {onCancel ? (
          <Button onClick={onCancel} variant="outlined">
            {viewMode ? 'Close' : 'Cancel'}
          </Button>
        ) : (
          <Button component={Link} href="/masters" variant="outlined">
            Back
          </Button>
        )}
        {!viewMode && (
          <Button variant="contained" type="submit" disabled={loading}>
            {loading ? 'Saving...' : (defaultValues?.id ? 'Update' : 'Create')}
          </Button>
        )}
      </Box>
    </Box>
  );
}

