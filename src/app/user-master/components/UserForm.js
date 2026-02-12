"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import {
  Box,
  MenuItem,
  Alert,
} from "@mui/material";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import PhoneField from "@/components/common/PhoneField";
import { validateE164Phone, validateEmail } from "@/utils/validators";

const UserForm = forwardRef(function UserForm({
  defaultValues = null,
  onSubmit,
  loading,
  roles = [],
  managers = [],
  serverError = null,
  onClearServerError = () => {},
  viewMode = false, // If true, all inputs are disabled
  onCancel = null, // Optional cancel handler for modal
}, ref) {
  const base = {
    name: "",
    email: "",
    role_id: null,
    manager_id: "",
    status: "active",
  };

  // extend with contact fields
  const contactDefaults = {
    address: "",
    brith_date: "",
    blood_group: "",
    mobile_number: "",
  };

  const [formData, setFormData] = useState({
    ...base,
    ...contactDefaults,
    ...(defaultValues || {}),
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (
      defaultValues &&
      (defaultValues.id || Object.keys(defaultValues).length)
    ) {
      setFormData({ ...base, ...contactDefaults, ...defaultValues });
    }
  }, [defaultValues?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (serverError) onClearServerError();
    
    // Real-time validation
    if (name === "email" && value && value.trim() !== "") {
      const emailValidation = validateEmail(value);
      if (!emailValidation.isValid) {
        setErrors((prev) => ({ ...prev, [name]: emailValidation.message }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    } else if (name === "mobile_number" && value && value.trim() !== "") {
      const phoneValidation = validateE164Phone(value, { required: false });
      if (!phoneValidation.isValid) {
        setErrors((prev) => ({ ...prev, [name]: phoneValidation.message }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    } else if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    setFormData((s) => ({ ...s, [name]: value }));
  };

  // first_login is managed by backend only; UI should not change it

  const formRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validationErrors = {};
    
    // Validate email (required)
    if (!formData.email || formData.email.trim() === "") {
      validationErrors.email = "Email is required";
    } else {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        validationErrors.email = emailValidation.message;
      }
    }
    
    // Validate mobile_number (optional, international E.164)
    if (formData.mobile_number && formData.mobile_number.trim() !== "") {
      const phoneValidation = validateE164Phone(formData.mobile_number, { required: false });
      if (!phoneValidation.isValid) {
        validationErrors.mobile_number = phoneValidation.message;
      }
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
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
        sx={{ 
          display: "flex", 
          flexDirection: "column", 
          height: "100%",
          width: "100%",
          maxWidth: "760px",
          mx: "auto",
        }}
      >
        <Box sx={{ 
          display: "grid", 
          gap: 1.5, 
          flex: 1, 
          overflowY: "auto", 
          pr: 1, 
          pt: 1,
          width: "100%",
        }}>
          <Input
            name="name"
            label="Name"
            value={formData.name || ""}
            onChange={handleChange}
            required={!viewMode}
            disabled={viewMode}
          />
          <Input
            name="email"
            label="Email"
            type="email"
            value={formData.email || ""}
            onChange={handleChange}
            required={!viewMode}
            disabled={viewMode}
            error={!!errors.email}
            helperText={errors.email}
          />

          <PhoneField
            name="mobile_number"
            label="Mobile Number"
            value={formData.mobile_number || ""}
            onChange={handleChange}
            disabled={viewMode}
            error={!!errors.mobile_number}
            helperText={errors.mobile_number}
          />
          <Input
            name="blood_group"
            label="Blood Group"
            value={formData.blood_group || ""}
            onChange={handleChange}
            disabled={viewMode}
          />
          <Input
            name="address"
            label="Address"
            value={formData.address || ""}
            onChange={handleChange}
            multiline
            rows={2}
            disabled={viewMode}
          />
          <DateField
            name="brith_date"
            label="Date of Birth"
            value={formData.brith_date || ""}
            onChange={handleChange}
            disabled={viewMode}
          />

          <Select
            name="role_id"
            label="Role"
            value={formData.role_id ?? ""}
            onChange={handleChange}
            required={!viewMode}
            disabled={viewMode}
          >
            <MenuItem value="">Select Role</MenuItem>
            {roles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
              </MenuItem>
            ))}
          </Select>

          <Select
            name="manager_id"
            label="Manager"
            value={formData.manager_id ?? ""}
            onChange={handleChange}
            disabled={viewMode}
          >
            <MenuItem value="">Select Manager</MenuItem>
            {managers.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </Select>

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

          {/* First Time Logged In is handled by the backend; don't render control in add/edit */}
          {viewMode && (
            <Input
              name="first_login"
              label="First Time Logged In"
              value={formData.first_login ? "Yes" : "No"}
              disabled
            />
          )}
        </Box>
      </Box>
    </>
  );
});

export default UserForm;
