"use client";

import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Typography,
  CircularProgress,
} from "@mui/material";
import Input from "@/components/common/Input";
import mastersService from "@/services/mastersService";

export default function DocumentUploadForm({
  defaultValues = {},
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => {},
  onCancel = null,
  documentTypes = [], // Can be passed from parent or fetched internally
  inquiryId = null, // Required for inquiry documents
}) {
  const [formData, setFormData] = useState({
    inquiry_id: defaultValues.inquiry_id || inquiryId || "",
    doc_type: defaultValues.doc_type || "",
    remarks: defaultValues.remarks || "",
    document: null,
  });

  const [documentTypesList, setDocumentTypesList] = useState(documentTypes);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [loadingTypes, setLoadingTypes] = useState(false);
  const hasFetchedRef = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFormData({
      inquiry_id: defaultValues.inquiry_id || inquiryId || "",
      doc_type: defaultValues.doc_type || "",
      remarks: defaultValues.remarks || "",
      document: null,
    });
  }, [defaultValues, inquiryId]);

  // Initialize document types from props or fetch if not provided
  useEffect(() => {
    // If documentTypes prop is provided and has items, use it
    if (documentTypes && documentTypes.length > 0) {
      setDocumentTypesList(documentTypes);
      return;
    }

    // Otherwise, fetch from API (only once)
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      const fetchDocumentTypes = async () => {
        setLoadingTypes(true);
        try {
          const response = await mastersService.getList("order_document_type", {
            page: 1,
            limit: 1000,
          });
          const data = response?.result?.data || response?.data || response || [];
          setDocumentTypesList(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error("Error fetching document types:", error);
          setDocumentTypesList([]);
        } finally {
          setLoadingTypes(false);
        }
      };
      fetchDocumentTypes();
    }
  }, [documentTypes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
    if (serverError) {
      onClearServerError();
    }
  };

  const handleDocTypeChange = (e) => {
    handleChange(e);
    // When document type changes after an error, allow retry
    // Reset file input to allow selecting file again
    if (serverError && fileInputRef.current) {
      fileInputRef.current.value = '';
      setSelectedFile(null);
      setFormData(prev => ({ ...prev, document: null }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFormData({ ...formData, document: file });
      if (errors.document) {
        setErrors({ ...errors, document: null });
      }
      // Clear server error when user selects a new file (allows retry)
      if (serverError) {
        onClearServerError();
      }
    } else {
      // Reset file if cleared
      setSelectedFile(null);
      setFormData({ ...formData, document: null });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.inquiry_id) {
      newErrors.inquiry_id = "Inquiry ID is required";
    }
    if (!formData.doc_type) {
      newErrors.doc_type = "Document type is required";
    }
    if (!formData.document && !defaultValues.document_path) {
      newErrors.document = "Please select a document";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  // Reset file input when loading completes after an error (allows resubmission)
  useEffect(() => {
    // When loading stops after an error, reset file input so user can select file again
    if (!loading && serverError && fileInputRef.current) {
      // Reset file input value to allow selecting the same file again
      fileInputRef.current.value = '';
    }
  }, [loading, serverError]);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
      <FormControl fullWidth margin="normal" error={!!errors.doc_type} required>
        <InputLabel>Document Type <Box component="span" sx={{ color: "error.main" }}>*</Box></InputLabel>
        <Select
          name="doc_type"
          value={formData.doc_type}
          onChange={handleDocTypeChange}
          disabled={loading || loadingTypes}
        >
          {documentTypesList.map((type) => (
            <MenuItem key={type.id} value={type.type}>
              {type.type}
            </MenuItem>
          ))}
        </Select>
        {errors.doc_type && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
            {errors.doc_type}
          </Typography>
        )}
      </FormControl>

      <Box sx={{ mt: 2, mb: 2 }}>
        <input
          accept="*/*"
          style={{ display: "none" }}
          id="document-upload"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={loading}
        />
        <label htmlFor="document-upload">
          <Button
            variant="outlined"
            component="span"
            fullWidth
            disabled={loading}
            sx={{ mb: 1 }}
          >
            {selectedFile ? selectedFile.name : defaultValues.document_path ? "Change Document" : "Choose Document"}
          </Button>
        </label>
        {selectedFile && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </Typography>
        )}
        {defaultValues.document_path && !selectedFile && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Current: {defaultValues.document_path}
          </Typography>
        )}
        {errors.document && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
            {errors.document}
          </Typography>
        )}
      </Box>

      <Input
        name="remarks"
        label="Remarks"
        value={formData.remarks}
        onChange={handleChange}
        fullWidth
        margin="normal"
        multiline
        rows={3}
        disabled={loading}
      />

      {serverError && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }} 
          onClose={onClearServerError}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={onClearServerError}
            >
              Dismiss
            </Button>
          }
        >
          {serverError}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
        {onCancel && (
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{ flex: 1 }}
        >
          {loading ? <CircularProgress size={24} /> : "Upload Document"}
        </Button>
      </Box>
    </Box>
  );
}

