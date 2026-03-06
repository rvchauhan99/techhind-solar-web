"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getReferenceOptionsSearch, getFileUrl, removeMasterFile } from "@/services/mastersService";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import Checkbox from "@/components/common/Checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/utils/toast";

export default function MasterForm({ 
  fields = [], 
  defaultValues = null, 
  onSubmit, 
  loading, 
  serverError = null, 
  onClearServerError = () => {},
  masterName = "Master",
  modelName = null,
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
  const [errors, setErrors] = useState({}); // Track validation errors
  const [selectedFile, setSelectedFile] = useState(null); // Store selected file for upload
  const [removingFile, setRemovingFile] = useState(false);

  const getOptionLabel = (opt) => opt?.label ?? opt?.name ?? opt?.username ?? (opt?.id != null ? String(opt.id) : '');

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

  const handleRemoveFile = async (fieldName) => {
    if (viewMode) return;
    const recordId = defaultValues?.id;
    if (!recordId || !modelName) {
      // New record: just clear local selection/value
      setSelectedFile(null);
      setFormData((prev) => ({ ...prev, [fieldName]: '' }));
      toastSuccess('File cleared');
      return;
    }
    try {
      setRemovingFile(true);
      const res = await removeMasterFile(modelName, recordId, fieldName);
      const updated = res?.result || res?.data || res;
      // Clear local state
      setSelectedFile(null);
      setFormData((prev) => ({ ...prev, [fieldName]: updated?.[fieldName] ?? '' }));
      toastSuccess('File removed');
    } catch (e) {
      toastError(e?.response?.data?.message || 'Failed to remove file');
    } finally {
      setRemovingFile(false);
    }
  };

  const handleViewFile = async (fieldName) => {
    const recordId = defaultValues?.id;
    if (!recordId || !modelName) return;
    try {
      const url = await getFileUrl(modelName, recordId);
      if (url) window.open(url, '_blank');
    } catch (e) {
      toastError(e?.response?.data?.message || 'Failed to get file URL');
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
    // Multiselect (custom) – async search
    if (field.isMultiSelect && field.reference) {
      const model = field.reference.model;
      const arr = Array.isArray(fieldValue) ? fieldValue : [];
      const valueObjs = arr.map((v) => (typeof v === 'object' && v !== null && (v.id != null || v.value != null) ? v : { id: v, value: v }));
      return (
        <AutocompleteField
          key={fieldName}
          name={fieldName}
          label={displayLabel}
          multiple
          asyncLoadOptions={(q) => getReferenceOptionsSearch(model, { q, limit: 20 })}
          getOptionLabel={getOptionLabel}
          value={valueObjs}
          onChange={(e, newValue) => handleChange({ target: { name: fieldName, value: (newValue || []).map((o) => o?.id ?? o?.value) } })}
          disabled={viewMode}
          required={isRequired && !viewMode}
          error={hasError}
          helperText={hasError ? errors[fieldName] : null}
          placeholder="Type to search..."
        />
      );
    }

    switch (field.type) {
      case 'BOOLEAN':
        return (
          <Checkbox
            key={fieldName}
            name={fieldName}
            label={displayLabel}
            checked={fieldValue === true || fieldValue === 'true' || fieldValue === 1}
            onChange={handleChange}
            disabled={viewMode}
          />
        );

      case 'INTEGER':
      case 'DECIMAL':
      case 'FLOAT':
        // Check if this is a reference field (foreign key) – async search
        if (field.reference) {
          const model = field.reference.model;
          return (
            <AutocompleteField
              key={fieldName}
              name={fieldName}
              label={displayLabel}
              asyncLoadOptions={(q) => getReferenceOptionsSearch(model, { q, limit: 20 })}
              referenceModel={model}
              getOptionLabel={getOptionLabel}
              value={fieldValue !== null && fieldValue !== undefined && fieldValue !== '' ? { id: fieldValue } : null}
              onChange={(e, newValue) => handleChange({ target: { name: fieldName, value: newValue?.id ?? newValue?.value ?? '' } })}
              disabled={viewMode}
              required={isRequired && !viewMode}
              error={hasError}
              helperText={hasError ? errors[fieldName] : null}
              placeholder="Type to search..."
            />
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
          const canActOnExisting = Boolean(defaultValues?.id && modelName);
          const hasExistingFile = Boolean(fieldValue);
          return (
            <div key={fieldName} className="space-y-1.5">
              <label className="block text-sm font-medium">
                {displayLabel}
                {isRequired && <span className="text-destructive ml-0.5">*</span>}
              </label>
              {!viewMode ? (
                <>
                  <input
                    accept="*/*"
                    className="hidden"
                    id={`file-upload-${fieldName}`}
                    type="file"
                    onChange={(e) => handleFileChange(e, fieldName)}
                  />
                  <div className="flex gap-2 items-center flex-wrap">
                    <label htmlFor={`file-upload-${fieldName}`} className="flex-1 min-w-0">
                      <Button type="button" variant="outline" className="w-full" asChild>
                        <span>{selectedFile ? selectedFile.name : (fieldValue || 'Choose File')}</span>
                      </Button>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewFile(fieldName)}
                      disabled={!canActOnExisting || !hasExistingFile}
                    >
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/50 hover:bg-destructive/10"
                      onClick={() => handleRemoveFile(fieldName)}
                      disabled={removingFile || (!selectedFile && !hasExistingFile)}
                    >
                      {removingFile ? 'Removing...' : 'Remove'}
                    </Button>
                  </div>
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">Selected: {selectedFile.name}</p>
                  )}
                  {hasError && (
                    <p className="text-xs text-destructive">{errors[fieldName]}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {fieldValue ? `File: ${fieldValue}` : 'No file uploaded'}
                </p>
              )}
            </div>
          );
        }
        
        // Check if it's a status field or enum-like field
        if (fieldName.toLowerCase().includes('status')) {
          const statusOptions = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }];
          const val = fieldValue || 'active';
          return (
            <AutocompleteField
              key={fieldName}
              name={fieldName}
              label={displayLabel}
              options={statusOptions}
              getOptionLabel={(o) => o?.label ?? o?.value ?? ''}
              value={statusOptions.find((o) => o.value === val) || { value: val, label: val === 'active' ? 'Active' : 'Inactive' }}
              onChange={(e, newValue) => handleChange({ target: { name: fieldName, value: newValue?.value ?? 'active' } })}
              disabled={viewMode}
              required={isRequired && !viewMode}
              error={hasError}
              helperText={hasError ? errors[fieldName] : null}
              placeholder="Status"
            />
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
      <div className="flex justify-center items-center min-h-[200px] text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-1">
      {serverError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span>{serverError}</span>
          <button type="button" onClick={onClearServerError} className="shrink-0 hover:opacity-80" aria-label="Dismiss">
            ×
          </button>
        </div>
      ) : null}

      <div className="grid gap-2">
        {fields.map((field, index) => {
          const renderedField = renderField(field);
          if (!renderedField) return null;

          const isFirstVisible = fields
            .slice(0, index)
            .every(f => ['id', 'created_at', 'updated_at', 'deleted_at'].includes(f.name));

          return (
            <div
              key={field.name || `field-${index}`}
              className={cn(isFirstVisible && "mt-0.5")}
            >
              {renderedField}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-2 flex-wrap">
        {onCancel ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {viewMode ? 'Close' : 'Cancel'}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/masters">Back</Link>
          </Button>
        )}
        {!viewMode && (
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Saving...' : (defaultValues?.id ? 'Update' : 'Create')}
          </Button>
        )}
      </div>
    </form>
  );
}

