"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import Input from "@/components/common/Input";
import { getNextClientCode } from "@/services/b2bClientService";
import {
  validateGSTIN,
  validatePAN,
  validateEmail,
  validatePhone,
  validatePincode,
  formatPhone,
  formatToUpperCase,
  derivePanFromGstin,
} from "@/utils/validators";

export default function B2bClientForm({
  defaultValues = {},
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => {},
  onCancel = null,
}) {
  const [formData, setFormData] = useState({
    client_code: "",
    client_name: "",
    contact_person: "",
    phone: "",
    email: "",
    gstin: "",
    pan_number: "",
    billing_address: "",
    billing_city: "",
    billing_district: "",
    billing_state: "",
    billing_pincode: "",
    billing_landmark: "",
    billing_country: "India",
    credit_limit: 0,
    credit_days: 0,
    is_active: true,
  });
  const [errors, setErrors] = useState({});
  const [loadingNextCode, setLoadingNextCode] = useState(false);

  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      setFormData({
        client_code: defaultValues.client_code || "",
        client_name: defaultValues.client_name || "",
        contact_person: defaultValues.contact_person || "",
        phone: defaultValues.phone || "",
        email: defaultValues.email || "",
        gstin: defaultValues.gstin || "",
        pan_number: defaultValues.pan_number || "",
        billing_address: defaultValues.billing_address || "",
        billing_city: defaultValues.billing_city || "",
        billing_district: defaultValues.billing_district || "",
        billing_state: defaultValues.billing_state || "",
        billing_pincode: defaultValues.billing_pincode || "",
        billing_landmark: defaultValues.billing_landmark || "",
        billing_country: defaultValues.billing_country || "India",
        credit_limit: defaultValues.credit_limit ?? 0,
        credit_days: defaultValues.credit_days ?? 0,
        is_active: defaultValues.is_active !== undefined ? defaultValues.is_active : true,
      });
    }
  }, [defaultValues]);

  useEffect(() => {
    const isAdd = !defaultValues?.id;
    const noCode = !defaultValues?.client_code || String(defaultValues?.client_code || "").trim() === "";
    if (isAdd && noCode) {
      getNextClientCode()
        .then((code) => {
          if (code) setFormData((prev) => ({ ...prev, client_code: code }));
        })
        .catch(() => {});
    }
  }, [defaultValues?.id, defaultValues?.client_code]);

  const handleGenerateCode = () => {
    setLoadingNextCode(true);
    getNextClientCode()
      .then((code) => {
        if (code) setFormData((prev) => ({ ...prev, client_code: code }));
      })
      .catch(() => {})
      .finally(() => setLoadingNextCode(false));
  };

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "client_code":
        if (!value || value.trim() === "") error = "Client Code is required";
        break;
      case "client_name":
        if (!value || value.trim() === "") error = "Client name is required";
        break;
      case "email":
        if (value && value.trim() !== "") {
          const emailValidation = validateEmail(value);
          if (!emailValidation.isValid) error = emailValidation.message;
        }
        break;
      case "phone":
        if (value && value.trim() !== "") {
          const phoneValidation = validatePhone(value);
          if (!phoneValidation.isValid) error = phoneValidation.message;
        }
        break;
      case "gstin":
        if (value && value.trim() !== "") {
          const gstinValidation = validateGSTIN(value);
          if (!gstinValidation.isValid) error = gstinValidation.message;
        }
        break;
      case "pan_number":
        if (value && value.trim() !== "") {
          const panValidation = validatePAN(value);
          if (!panValidation.isValid) error = panValidation.message;
        }
        break;
      case "billing_pincode":
        if (value && value.trim() !== "") {
          const pincodeValidation = validatePincode(value);
          if (!pincodeValidation.isValid) error = pincodeValidation.message;
        }
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = type === "checkbox" ? checked : value;
    if (type !== "checkbox") {
      if (name === "gstin" || name === "pan_number") {
        processedValue = formatToUpperCase(value);
      } else if (name === "phone") {
        processedValue = value;
      } else if (name === "credit_limit") {
        processedValue = parseFloat(value) || 0;
        setFormData((prev) => ({ ...prev, [name]: processedValue }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
        return;
      } else if (name === "credit_days") {
        processedValue = parseInt(value, 10) || 0;
        setFormData((prev) => ({ ...prev, [name]: processedValue }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
        return;
      }
    }
    if (name === "gstin") {
      const newGstin = processedValue;
      const isGstinEmpty = !newGstin || newGstin.trim() === "";
      const derivedPan = isGstinEmpty ? null : derivePanFromGstin(newGstin);
      setFormData((prev) => ({
        ...prev,
        gstin: newGstin,
        pan_number: isGstinEmpty ? "" : (derivedPan != null ? derivedPan : prev.pan_number),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: processedValue }));
    }
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    if (serverError) onClearServerError();
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === "phone" && value && value.trim() !== "") {
      const formatted = formatPhone(value);
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    }
    const error = validateField(name, value);
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (serverError) onClearServerError();
    const validationErrors = {};
    if (!formData.client_code || formData.client_code.trim() === "") {
      validationErrors.client_code = "Client Code is required";
    }
    if (!formData.client_name || formData.client_name.trim() === "") {
      validationErrors.client_name = "Client name is required";
    }
    if (formData.email && formData.email.trim() !== "") {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) validationErrors.email = emailValidation.message;
    }
    if (formData.phone && formData.phone.trim() !== "") {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.isValid) validationErrors.phone = phoneValidation.message;
    }
    if (formData.gstin && formData.gstin.trim() !== "") {
      const gstinValidation = validateGSTIN(formData.gstin);
      if (!gstinValidation.isValid) validationErrors.gstin = gstinValidation.message;
    }
    if (formData.pan_number && formData.pan_number.trim() !== "") {
      const panValidation = validatePAN(formData.pan_number);
      if (!panValidation.isValid) validationErrors.pan_number = panValidation.message;
    }
    if (formData.billing_pincode && formData.billing_pincode.trim() !== "") {
      const pincodeValidation = validatePincode(formData.billing_pincode);
      if (!pincodeValidation.isValid) validationErrors.billing_pincode = pincodeValidation.message;
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    const submitData = {
      ...formData,
      client_code: formData.client_code.trim(),
      client_name: formData.client_name.trim(),
      contact_person: formData.contact_person?.trim() || "",
      phone: formData.phone?.trim() || "",
      email: formData.email?.trim() || "",
      gstin: formData.gstin?.trim().toUpperCase() || "",
      pan_number: formData.pan_number?.trim().toUpperCase() || "",
      billing_address: formData.billing_address?.trim() || "",
      billing_city: formData.billing_city?.trim() || "",
      billing_district: formData.billing_district?.trim() || "",
      billing_state: formData.billing_state?.trim() || "",
      billing_pincode: formData.billing_pincode?.trim() || "",
      billing_landmark: formData.billing_landmark?.trim() || "",
      billing_country: formData.billing_country?.trim() || "India",
    };
    setErrors({});
    onSubmit(submitData);
  };

  return (
    <FormContainer>
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {serverError}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                fullWidth
                name="client_code"
                label="Client Code"
                value={formData.client_code}
                onChange={handleChange}
                error={!!errors.client_code}
                helperText={errors.client_code}
                required
                disabled={!!defaultValues?.id}
              />
              {!defaultValues?.id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateCode}
                  disabled={loadingNextCode}
                  className="shrink-0 self-end"
                >
                  {loadingNextCode ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent block" />
                  ) : (
                    "Generate"
                  )}
                </Button>
              )}
            </div>
          </div>
          <Input
            fullWidth
            name="client_name"
            label="Client Name"
            value={formData.client_name}
            onChange={handleChange}
            error={!!errors.client_name}
            helperText={errors.client_name}
            required
          />
          <Input
            fullWidth
            name="contact_person"
            label="Contact Person"
            value={formData.contact_person}
            onChange={handleChange}
          />
          <Input
            fullWidth
            name="phone"
            label="Phone"
            value={formData.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            error={!!errors.phone}
            helperText={errors.phone}
            placeholder="9876543210 or +91 9876543210"
          />
          <Input
            fullWidth
            name="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={!!errors.email}
            helperText={errors.email}
          />
          <Input
            fullWidth
            name="gstin"
            label="GSTIN"
            value={formData.gstin}
            onChange={handleChange}
            onBlur={handleBlur}
            error={!!errors.gstin}
            helperText={errors.gstin}
            inputProps={{ maxLength: 15 }}
            placeholder="27AAAAA0000A1Z5"
          />
          <Input
            fullWidth
            name="pan_number"
            label="PAN Number"
            value={formData.pan_number}
            onChange={handleChange}
            onBlur={handleBlur}
            error={!!errors.pan_number}
            helperText={errors.pan_number}
            inputProps={{ maxLength: 10 }}
            placeholder="ABCDE1234F"
          />
          <Input
            fullWidth
            name="credit_limit"
            label="Credit Limit"
            type="number"
            value={formData.credit_limit}
            onChange={handleChange}
          />
          <Input
            fullWidth
            name="credit_days"
            label="Credit Days"
            type="number"
            value={formData.credit_days}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Billing Address (Indian)</p>
          <Input
            fullWidth
            name="billing_address"
            label="Street / Area"
            value={formData.billing_address}
            onChange={handleChange}
            multiline
            rows={2}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              fullWidth
              name="billing_city"
              label="City"
              value={formData.billing_city}
              onChange={handleChange}
            />
            <Input
              fullWidth
              name="billing_district"
              label="District"
              value={formData.billing_district}
              onChange={handleChange}
            />
            <Input
              fullWidth
              name="billing_state"
              label="State"
              value={formData.billing_state}
              onChange={handleChange}
            />
            <Input
              fullWidth
              name="billing_pincode"
              label="Pincode"
              value={formData.billing_pincode}
              onChange={handleChange}
              onBlur={handleBlur}
              error={!!errors.billing_pincode}
              helperText={errors.billing_pincode}
              inputProps={{ maxLength: 6 }}
            />
            <Input
              fullWidth
              name="billing_landmark"
              label="Landmark"
              value={formData.billing_landmark}
              onChange={handleChange}
            />
            <Input
              fullWidth
              name="billing_country"
              label="Country"
              value={formData.billing_country}
              onChange={handleChange}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              id="b2b-client-is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="size-4 rounded border-input"
            />
            <span className="text-sm font-medium cursor-pointer">Active</span>
          </label>
        </div>
        <FormActions>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </FormActions>
      </form>
    </FormContainer>
  );
}
